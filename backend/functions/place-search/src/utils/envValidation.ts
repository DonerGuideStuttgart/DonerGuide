/**
 * Environment variable validation utilities
 */

/**
 * Validates that all required environment variables are configured
 *
 * Call this at module initialization to fail-fast on missing config.
 * Azure Functions will prevent deployment if env vars are missing.
 *
 * @throws Error if any required environment variable is missing
 */
export function validateEnvironmentVariables(): void {
  const missingVars: string[] = [];

  // Critical environment variables
  if (process.env.GOOGLE_PLACES_API_KEY === undefined || process.env.GOOGLE_PLACES_API_KEY === "") {
    missingVars.push("GOOGLE_PLACES_API_KEY");
  }

  if (
    process.env.PLACE_SEARCH_COSMOSDB_CONNECTION_STRING === undefined ||
    process.env.PLACE_SEARCH_COSMOSDB_CONNECTION_STRING === ""
  ) {
    missingVars.push("PLACE_SEARCH_COSMOSDB_CONNECTION_STRING");
  }

  if (
    process.env.PLACE_SEARCH_SERVICEBUS_CONNECTION_STRING === undefined ||
    process.env.PLACE_SEARCH_SERVICEBUS_CONNECTION_STRING === ""
  ) {
    missingVars.push("PLACE_SEARCH_SERVICEBUS_CONNECTION_STRING");
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}. ` +
        `Please configure these in local.settings.json (local), Docker environment, or Azure Function App settings (production).`
    );
  }
}
