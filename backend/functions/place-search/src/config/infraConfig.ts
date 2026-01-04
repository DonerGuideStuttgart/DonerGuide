/**
 * Infrastructure configuration for Azure services (Cosmos DB, Service Bus)
 */

/**
 * Cosmos DB configuration
 */
export const COSMOS_CONFIG = {
  connectionString: process.env.PLACE_SEARCH_COSMOSDB_CONNECTION_STRING ?? "",
  databaseName: process.env.PLACE_SEARCH_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB",
  placesContainerName: process.env.PLACE_SEARCH_COSMOSDB_CONTAINER_NAME ?? "Places",
};

/**
 * Service Bus configuration
 */
export const SERVICE_BUS_CONFIG = {
  gridPointsQueueName: "grid-points",
  placesQueueName: "places",
  connectionStringEnvVar: "PLACE_SEARCH_SERVICEBUS_CONNECTION_STRING",
};
