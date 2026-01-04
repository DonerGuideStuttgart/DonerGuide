import { SUBDIVISION_CONFIG } from "../config/adaptiveGridConfig";

/**
 * Validates subdivision configuration
 *
 * @throws Error if configuration is invalid
 */
export function validateSubdivisionConfig(): void {
  if (SUBDIVISION_CONFIG.threshold <= 0 || SUBDIVISION_CONFIG.threshold > 60) {
    throw new Error(`Invalid subdivision threshold: ${String(SUBDIVISION_CONFIG.threshold)}. Must be 1-60.`);
  }

  if (SUBDIVISION_CONFIG.maxDepth < 1 || SUBDIVISION_CONFIG.maxDepth > 10) {
    throw new Error(`Invalid max depth: ${String(SUBDIVISION_CONFIG.maxDepth)}. Must be 1-10.`);
  }

  if (SUBDIVISION_CONFIG.minRadiusM < 10 || SUBDIVISION_CONFIG.minRadiusM > 1000) {
    throw new Error(`Invalid min radius: ${String(SUBDIVISION_CONFIG.minRadiusM)}m. Must be 10-1000m.`);
  }
}
