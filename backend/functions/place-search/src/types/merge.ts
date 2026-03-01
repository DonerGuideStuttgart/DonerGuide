import type { GridCell } from "./grid";

export interface MergeCandidatePair {
  cellA: GridCell;
  cellB: GridCell;
  combinedResultsCount: number;
  mergedBoundaryBox: GridCell["boundaryBox"];
  sharedAxis: "lat" | "lon";
}

export interface MergeResult {
  sourceGridVersion: string;
  targetGridVersion: string;
  originalLeafCellCount: number;
  mergedCellCount: number;
  cellsSaved: number;
}
