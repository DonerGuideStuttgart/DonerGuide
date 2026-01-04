import type { Place } from "doner_types";

/**
 * Extended Place type used during search operations
 * Includes temporary metadata that is relevant during search/deduplication
 * but should not be persisted to the database
 */
export interface PlaceSearchResult extends Place {
  /**
   * Search queries that found this place (e.g., ["Döner", "Kebab"])
   * Used for deduplication and debugging during search operations
   */
  foundViaQueries: string[];
}
