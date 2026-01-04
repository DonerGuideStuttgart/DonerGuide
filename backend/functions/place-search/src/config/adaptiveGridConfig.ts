/**
 * Adaptive Grid Configuration.
 *
 * Defines parameters for the grid generation and recursive subdivision logic
 * to ensure complete coverage while respecting API limits.
 */

/**
 * Base cell size (in km) for the initial grid.
 *
 * A larger size is used initially for efficiency, relying on subdivision
 * to handle areas with high place density.
 */
export const BASE_CELL_SIZE_KM = 8;

/**
 * Settings for controlling the grid subdivision behavior.
 */
export interface SubdivisionConfig {
  /**
   * Result count to trigger subdivision.
   * Usually set below the API limit to handle fluctuations and ensure coverage.
   */
  threshold: number;

  /**
   * Maximum allowed recursion depth for subdivision.
   * Prevents excessive API calls and infinite loops.
   */
  maxDepth: number;

  /**
   * Minimum radius (in meters) for a search area.
   * Prevents subdividing into impractically small cells.
   */
  minRadiusM: number;
}

/**
 * Default configuration for subdivision.
 */
export const SUBDIVISION_CONFIG: SubdivisionConfig = {
  threshold: 55, // Trigger split at 55 to handle API fluctuations and stay under 60-limit
  maxDepth: 5, // Allow reasonable granularity
  minRadiusM: 50, // Stop if area becomes too small
};
