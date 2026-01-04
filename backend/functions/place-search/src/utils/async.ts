/**
 * Async utility functions
 */

/**
 * Delays execution for specified milliseconds
 *
 * Used for rate limiting and backoff strategies
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 *
 * @example
 * await delay(1000); // Wait 1 second
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
