import { Container } from "@azure/cosmos";
import { v4 as uuidv4 } from "uuid";
import { GridCell } from "../types/grid";
import {
  getStuttgartBBox,
  cellIntersectsBoundary,
  kmToDegreesLat,
  kmToDegreesLng,
  getCellSideKm,
} from "../utils/geometry.util";
import { GRID_CONFIG } from "../config/gridConfig";

export class GridService {
  constructor(private container: Container) {}

  /**
   * Initializes the grid if the version has changed or no cells exist.
   * Creates a 4x4 level 0 grid for Stuttgart.
   */
  async initializeGrid(gridVersion: string): Promise<void> {
    const query = `SELECT VALUE COUNT(c.id) FROM c WHERE c.gridVersion = '${gridVersion}'`;
    const { resources: existing } = await this.container.items.query({ query }).fetchAll();

    if (existing[0] > 0) {
      return;
    }

    const { minLat, minLon, maxLat, maxLon } = getStuttgartBBox();

    const latStep = kmToDegreesLat(GRID_CONFIG.baseCellSizeKm);
    const rows = Math.ceil((maxLat - minLat) / latStep);

    const cells: GridCell[] = [];

    for (let i = 0; i < rows; i++) {
      const cellMinLat = minLat + i * latStep;
      const cellMaxLat = Math.min(minLat + (i + 1) * latStep, maxLat);
      const centerLat = (cellMinLat + cellMaxLat) / 2;

      const lonStep = kmToDegreesLng(GRID_CONFIG.baseCellSizeKm, centerLat);
      const cols = Math.ceil((maxLon - minLon) / lonStep);

      for (let j = 0; j < cols; j++) {
        const cellMinLon = minLon + j * lonStep;
        const cellMaxLon = Math.min(minLon + (j + 1) * lonStep, maxLon);

        const bbox = {
          minLat: cellMinLat,
          minLon: cellMinLon,
          maxLat: cellMaxLat,
          maxLon: cellMaxLon,
        };

        // Only create cells that intersect the Stuttgart boundary
        if (!cellIntersectsBoundary(bbox)) continue;

        const cell: GridCell = {
          id: uuidv4(),
          gridVersion,
          level: 0,
          status: "PENDING",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [cellMinLon, cellMinLat],
                [cellMaxLon, cellMinLat],
                [cellMaxLon, cellMaxLat],
                [cellMinLon, cellMaxLat],
                [cellMinLon, cellMinLat],
              ],
            ],
          },
          boundaryBox: bbox,
          resultsCount: 0,
          foundPlaceIds: [],
          lastProcessedAt: "2000-01-01T00:00:00Z", // Use a static old date without lots of trailing zeros
        };
        cells.push(cell);
      }
    }

    // Upsert all cells
    for (const cell of cells) {
      await this.container.items.upsert(cell);
    }
  }

  /**
   * Finds the oldest cell that is not SPLIT.
   * Also considers stale PROCESSING cells (> 30 mins).
   */
  async getNextCell(gridVersion: string): Promise<GridCell | null> {
    const staleThreshold = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const query = `
        SELECT * FROM c 
        WHERE c.gridVersion = '${gridVersion}' 
        AND c.status != 'SPLIT' 
        AND (c.status != 'PROCESSING' OR c.lastProcessedAt < '${staleThreshold}')
        ORDER BY c.lastProcessedAt ASC
      `;

    const { resources: cells } = await this.container.items.query<GridCell>({ query }).fetchAll();

    if (cells.length > 0 && cells[0].status === "PROCESSING") {
      console.log(
        `[GridService] Zombie-Reset: Picking up stale cell ${cells[0].id} (Last processed: ${cells[0].lastProcessedAt})`
      );
    }

    return cells.length > 0 ? cells[0] : null;
  }

  /**
   * Updates cell status and processing time.
   */
  async markAsProcessing(cell: GridCell): Promise<void> {
    cell.status = "PROCESSING";
    cell.lastProcessedAt = new Date().toISOString();
    await this.container.items.upsert(cell);
  }

  /**
   * Splits a cell into two child cells along its longest axis.
   * If MAX_LEVEL is reached, marks as COMPLETED with overflow.
   */
  async splitCell(cell: GridCell): Promise<void> {
    const { maxDepth, minCellSizeM } = GRID_CONFIG.subdivision;

    if (cell.level >= maxDepth) {
      console.warn(`[GridService] maxDepth reached for cell ${cell.id}. Marking as COMPLETED (Overflow).`);
      cell.status = "COMPLETED";
      cell.lastProcessedAt = new Date().toISOString();
      await this.container.items.upsert(cell);
      return;
    }

    const { minLat, minLon, maxLat, maxLon } = cell.boundaryBox;
    const latDiff = maxLat - minLat;
    const lonDiff = maxLon - minLon;

    // Candidate bounding boxes for the two halves of the split
    const candidateBBoxes: GridCell["boundaryBox"][] = [];
    const newLevel = cell.level + 1;

    const { latSideKm, lonSideKm } = getCellSideKm(cell.boundaryBox);

    // Check if child cells would be smaller than minCellSizeM
    const minSideKm = Math.min(latSideKm, lonSideKm);
    const childMinSideM = (minSideKm / 2) * 1000; // halving the shorter side
    if (childMinSideM < minCellSizeM) {
      console.warn(
        `[GridService] Child cell would be ${String(Math.round(childMinSideM))}m, below minCellSizeM (${String(minCellSizeM)}m). Marking cell ${cell.id} as COMPLETED.`
      );
      cell.status = "COMPLETED";
      cell.lastProcessedAt = new Date().toISOString();
      await this.container.items.upsert(cell);
      return;
    }
    if (latSideKm >= lonSideKm) {
      // Split Latitude
      const midLat = minLat + latDiff / 2;

      candidateBBoxes.push({ ...cell.boundaryBox, maxLat: midLat });
      candidateBBoxes.push({ ...cell.boundaryBox, minLat: midLat });
    } else {
      // Split Longitude
      const midLon = minLon + lonDiff / 2;

      candidateBBoxes.push({ ...cell.boundaryBox, maxLon: midLon });
      candidateBBoxes.push({ ...cell.boundaryBox, minLon: midLon });
    }

    // Only keep child cells that intersect the city boundary
    const childCells = candidateBBoxes
      .filter((bbox) => cellIntersectsBoundary(bbox))
      .map((bbox) => this.createChildCell(cell, bbox, newLevel));

    // Mark parent as SPLIT
    cell.status = "SPLIT";
    cell.lastProcessedAt = new Date().toISOString();

    // Atomic-like update: Create children first, then update parent
    // (CosmosDB throughput permitting, we could use batch but simple loop is fine for 2 items)
    for (const child of childCells) {
      await this.container.items.create(child);
    }
    await this.container.items.upsert(cell);

    console.log(
      `[GridService] Cell ${cell.id} split into ${childCells.map((c, index) => `${index}. Child: ${c.id}`)} (Level ${newLevel})`
    );
  }

  private createChildCell(parent: GridCell, bbox: GridCell["boundaryBox"], level: number): GridCell {
    return {
      id: uuidv4(),
      gridVersion: parent.gridVersion,
      level: level,
      status: "PENDING",
      boundaryBox: bbox,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [bbox.minLon, bbox.minLat],
            [bbox.maxLon, bbox.minLat],
            [bbox.maxLon, bbox.maxLat],
            [bbox.minLon, bbox.maxLat],
            [bbox.minLon, bbox.minLat],
          ],
        ],
      },
      resultsCount: 0,
      foundPlaceIds: [],
      lastProcessedAt: new Date(0).toISOString(),
    };
  }
}
