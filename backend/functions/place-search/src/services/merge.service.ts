import { Container } from "@azure/cosmos";
import { v4 as uuidv4 } from "uuid";
import type { GridCell } from "../types/grid";
import type { MergeCandidatePair, MergeResult } from "../types/merge";
import { GRID_CONFIG } from "../config/gridConfig";
import { getCellSideKm } from "../utils/geometry.util";
import { shareFullLatEdge, shareFullLonEdge, mergeBoundingBoxes, bboxToGeometry } from "../utils/mergeGeometry.util";

export class MergeService {
  constructor(private container: Container) {}

  /** Checks whether all cells of a grid version are either COMPLETED or SPLIT. */
  async isGridComplete(gridVersion: string): Promise<boolean> {
    const query = `SELECT VALUE COUNT(c.id) FROM c WHERE c.gridVersion = '${gridVersion}' AND c.status NOT IN ('COMPLETED', 'SPLIT')`;
    const { resources } = await this.container.items.query<number>({ query }).fetchAll();
    return resources[0] === 0;
  }

  /** Returns all COMPLETED (non-SPLIT) leaf cells for a given grid version. */
  async getLeafCells(gridVersion: string): Promise<GridCell[]> {
    const query = `SELECT * FROM c WHERE c.gridVersion = '${gridVersion}' AND c.status = 'COMPLETED'`;
    const { resources } = await this.container.items.query<GridCell>({ query }).fetchAll();
    return resources;
  }

  /**
   * Finds all merge candidate pairs that share a full edge
   * and satisfy the merge constraints (max results, max cell size).
   */
  findMergeCandidates(leafCells: GridCell[]): MergeCandidatePair[] {
    const { maxMergedResults, maxMergedCellSizeKm } = GRID_CONFIG.merge;
    const candidates: MergeCandidatePair[] = [];

    for (let i = 0; i < leafCells.length; i++) {
      for (let j = i + 1; j < leafCells.length; j++) {
        const cellA = leafCells[i];
        const cellB = leafCells[j];
        const combinedResultsCount = cellA.resultsCount + cellB.resultsCount;

        if (combinedResultsCount > maxMergedResults) continue;

        let sharedAxis: "lat" | "lon" | null = null;
        if (shareFullLatEdge(cellA.boundaryBox, cellB.boundaryBox)) {
          sharedAxis = "lat";
        } else if (shareFullLonEdge(cellA.boundaryBox, cellB.boundaryBox)) {
          sharedAxis = "lon";
        }

        if (!sharedAxis) continue;

        const mergedBoundaryBox = mergeBoundingBoxes(cellA.boundaryBox, cellB.boundaryBox);

        // Check if the merged cell would exceed the max size
        const { latSideKm, lonSideKm } = getCellSideKm(mergedBoundaryBox);
        if (latSideKm > maxMergedCellSizeKm || lonSideKm > maxMergedCellSizeKm) continue;

        candidates.push({
          cellA,
          cellB,
          combinedResultsCount,
          mergedBoundaryBox,
          sharedAxis,
        });
      }
    }

    // Sort by combined results count ascending (lowest first)
    candidates.sort((a, b) => a.combinedResultsCount - b.combinedResultsCount);
    return candidates;
  }

  /**
   * Greedy merge algorithm: iterates until no more merges are possible.
   * Merged cells become candidates for further merging.
   */
  performMerges(leafCells: GridCell[]): GridCell[] {
    let currentCells = [...leafCells];
    let candidates = this.findMergeCandidates(currentCells);

    while (candidates.length > 0) {
      // Pick the pair with the lowest combined results count
      const best = candidates[0];
      const mergedCell = this.createMergedCell(best);

      // Remove the two merged cells and add the new one
      currentCells = currentCells.filter((c) => c.id !== best.cellA.id && c.id !== best.cellB.id);
      currentCells.push(mergedCell);

      candidates = this.findMergeCandidates(currentCells);
    }

    return currentCells;
  }

  /**
   * Orchestrates the full merge process:
   * loads leaf cells, performs merges, and persists results as a new grid version.
   */
  async optimizeGrid(sourceGridVersion: string, targetGridVersion: string): Promise<MergeResult | null> {
    const isComplete = await this.isGridComplete(sourceGridVersion);
    if (!isComplete) {
      console.log(`[MergeService] Grid ${sourceGridVersion} is not complete. Aborting merge.`);
      return null;
    }

    const leafCells = await this.getLeafCells(sourceGridVersion);
    if (leafCells.length === 0) {
      console.log(`[MergeService] No leaf cells found for grid ${sourceGridVersion}.`);
      return null;
    }

    const optimizedCells = this.performMerges(leafCells);

    // Persist optimized cells as a new grid version
    for (const cell of optimizedCells) {
      const newCell: GridCell = {
        ...cell,
        id: uuidv4(),
        gridVersion: targetGridVersion,
        status: "PENDING",
        resultsCount: cell.resultsCount,
        foundPlaceIds: [],
        lastProcessedAt: "2000-01-01T00:00:00Z",
      };
      await this.container.items.upsert(newCell);
    }

    const cellsSaved = leafCells.length - optimizedCells.length;
    console.log(
      `[MergeService] Optimized grid: ${String(leafCells.length)} → ${String(optimizedCells.length)} cells (saved ${String(cellsSaved)})`
    );

    return {
      sourceGridVersion,
      targetGridVersion,
      originalLeafCellCount: leafCells.length,
      mergedCellCount: optimizedCells.length,
      cellsSaved,
    };
  }

  private createMergedCell(pair: MergeCandidatePair): GridCell {
    const { mergedBoundaryBox, combinedResultsCount } = pair;
    return {
      id: uuidv4(),
      gridVersion: pair.cellA.gridVersion,
      level: Math.min(pair.cellA.level, pair.cellB.level),
      status: "COMPLETED",
      boundaryBox: mergedBoundaryBox,
      geometry: bboxToGeometry(mergedBoundaryBox),
      resultsCount: combinedResultsCount,
      foundPlaceIds: [],
      lastProcessedAt: new Date().toISOString(),
    };
  }
}
