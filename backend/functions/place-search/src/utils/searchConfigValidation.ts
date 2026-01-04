import { API_CONFIG } from "../config/searchConfig";

/**
 * Validates that textQueries is configured correctly
 * Throws error if invalid - call this on function startup
 *
 * @throws Error if textQueries is empty, contains empty strings, or has duplicates
 */
export function validateQueries(): void {
  if (API_CONFIG.textQueries.length === 0) {
    throw new Error("API_CONFIG.textQueries must contain at least one query");
  }

  if (API_CONFIG.textQueries.some((q) => !q || q.trim() === "")) {
    throw new Error("API_CONFIG.textQueries cannot contain empty queries");
  }

  // Prevent duplicate queries (waste of API calls)
  const uniqueQueries = new Set(API_CONFIG.textQueries);
  if (uniqueQueries.size < API_CONFIG.textQueries.length) {
    throw new Error("API_CONFIG.textQueries contains duplicate queries");
  }
}
