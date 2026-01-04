/**
 * Calculation utility functions
 */

/**
 * Calculates the deduplication rate as a percentage
 *
 * @param uniquePlaces - Number of unique places
 * @param totalResults - Total number of results (including duplicates)
 * @returns Deduplication rate as a string with one decimal place
 *
 * @example
 * calculateDeduplicationRate(80, 100); // "20.0"
 */
export function calculateDeduplicationRate(uniquePlaces: number, totalResults: number): string {
  return totalResults > 0 ? ((1 - uniquePlaces / totalResults) * 100).toFixed(1) : "0";
}
