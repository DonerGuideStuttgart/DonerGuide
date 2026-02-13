interface GridConfig {
  baseCellSizeKm: number;
  subdivision: {
    threshold: number;
    maxDepth: number;
    minCellSizeM: number;
  };
}

export function validateGridConfig(config: GridConfig): void {
  const { baseCellSizeKm, subdivision } = config;

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
}
