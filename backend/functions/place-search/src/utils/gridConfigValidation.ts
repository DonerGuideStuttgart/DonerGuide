interface GridConfig {
  baseCellSizeKm: number;
  subdivision: {
    threshold: number;
    maxDepth: number;
    minCellSizeM: number;
  };
  merge: {
    maxMergedResults: number;
    maxMergedCellSizeKm: number;
  };
}

export function validateGridConfig(config: GridConfig): void {
  const { baseCellSizeKm, subdivision, merge } = config;

  if (baseCellSizeKm < 0.1 || baseCellSizeKm > 50) {
    throw new Error(`GRID_CONFIG.baseCellSizeKm must be between 0.1 and 50, got ${String(baseCellSizeKm)}`);
  }

  if (subdivision.threshold < 1 || subdivision.threshold > 60) {
    throw new Error(`GRID_CONFIG.subdivision.threshold must be between 1 and 60, got ${String(subdivision.threshold)}`);
  }

  if (subdivision.maxDepth < 1 || subdivision.maxDepth > 15) {
    throw new Error(`GRID_CONFIG.subdivision.maxDepth must be between 1 and 15, got ${String(subdivision.maxDepth)}`);
  }

  if (subdivision.minCellSizeM < 10 || subdivision.minCellSizeM > 5000) {
    throw new Error(
      `GRID_CONFIG.subdivision.minCellSizeM must be between 10 and 5000, got ${String(subdivision.minCellSizeM)}`
    );
  }

  if (merge.maxMergedResults < 1 || merge.maxMergedResults > 60) {
    throw new Error(
      `GRID_CONFIG.merge.maxMergedResults must be between 1 and 60, got ${String(merge.maxMergedResults)}`
    );
  }

  if (merge.maxMergedCellSizeKm < 1 || merge.maxMergedCellSizeKm > 50) {
    throw new Error(
      `GRID_CONFIG.merge.maxMergedCellSizeKm must be between 1 and 50, got ${String(merge.maxMergedCellSizeKm)}`
    );
  }
}
