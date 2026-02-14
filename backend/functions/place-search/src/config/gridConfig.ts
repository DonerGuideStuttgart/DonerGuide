import { validateGridConfig } from "../utils/gridConfigValidation";

export const GRID_CONFIG = {
  /** Initiale Zellgröße in km für das Startgrid */
  baseCellSizeKm: 5,

  subdivision: {
    /** Ab dieser Ergebnisanzahl wird gesplittet (Google Places API paginiert max 60) */
    threshold: 55,
    /** Maximale Splitting-Tiefe (0 = Startzelle) */
    maxDepth: 10,
    /** Minimale Zellseitenlänge in Metern — darunter wird nicht mehr gesplittet */
    minCellSizeM: 50,
  },

  merge: {
    /** Max combined results for merged cells — conservative buffer below split threshold */
    maxMergedResults: 40,
    /** Max side length of a merged cell in km */
    maxMergedCellSizeKm: 15,
  },
} as const;

validateGridConfig(GRID_CONFIG);
