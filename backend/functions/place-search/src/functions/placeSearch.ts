/**
 * Place Search Azure Function
 *
 * Service Bus Queue-triggered function that searches for Döner shops
 * at a specific grid point using Google Places API (New) Text Search.
 */

import { app, InvocationContext, output } from "@azure/functions";
import type { NewPhotosMessage } from "doner_types";
import type { GridPointMessage } from "../types/grid.types";
import type { GooglePlace } from "../types/googlePlaces.types";
import type { PlaceSearchResult } from "../types/placeSearchResult.types";
import { textSearchWithSubdivisionDetection } from "../services/googlePlacesService";
import { googlePlaceToPlace } from "../mappers/placeMapper";
import { subdivideCell } from "../services/subdivisionService";
import { API_CONFIG } from "../config/searchConfig";
import { validateQueries } from "../utils/searchConfigValidation";
import { SERVICE_BUS_CONFIG } from "../config/infraConfig";
import { validateEnvironmentVariables } from "../utils/envValidation";
import { SUBDIVISION_CONFIG } from "../config/adaptiveGridConfig";
import { delay } from "../utils/async";
import { upsertPlaces } from "../services/cosmosDbService";
import { calculateDeduplicationRate } from "../utils/calculations";

// Validate configuration once at module load
validateQueries();

/**
 * Result from a single query execution
 */
export interface QueryResult {
  query: string;
  places: GooglePlace[];
  resultCount: number;
}

/**
 * Result of processing a grid point
 * Shared between production handler and test workflow
 */
export interface GridProcessingResult {
  queryResults: QueryResult[]; // Per-query breakdown
  places: PlaceSearchResult[]; // Mapped and deduplicated across all queries
  childCells: GridPointMessage[];
  resultCount: number; // MAX across all queries (determines subdivision)
  needsSubdivision: boolean;
}

 /**
  * Core business logic for processing a grid point
  * Shared between production handler and test workflow
  *
  * This function encapsulates the pure business logic without
  * production-specific concerns (Service Bus, Cosmos DB, logging).
  *
  * @param gridPoint - Grid cell to process
  * @returns Processed places and child cells for subdivision
  */
 export async function processGridPointLogic(gridPoint: GridPointMessage): Promise<GridProcessingResult> {
  const queryResults: QueryResult[] = [];
  const placeMap = new Map<string, PlaceSearchResult>(); // Dedupe across queries and map to PlaceSearchResult objects

  // LAYER 1: Search for places using MULTIPLE queries (SEQUENTIAL execution)
  // Errors propagate to handler, triggering Service Bus retry for the entire grid point
  for (let i = 0; i < API_CONFIG.textQueries.length; i++) {
    const query = API_CONFIG.textQueries[i];

    const searchResult = await textSearchWithSubdivisionDetection(
      query,
      gridPoint.searchRectangle,
      gridPoint.subdivisionDepth || 0
    );

    // Track per-query results for analytics
    queryResults.push({
      query,
      places: searchResult.places,
      resultCount: searchResult.resultCount,
    });

    // Map GooglePlace to Place and deduplicate across queries
    for (const googlePlace of searchResult.places) {
      const existingPlace = placeMap.get(googlePlace.id);

      if (existingPlace) {
        // Place already found by another query - add query to foundViaQueries
        if (!existingPlace.foundViaQueries.includes(query)) {
          existingPlace.foundViaQueries.push(query);
        }
      } else {
        // New place - convert GooglePlace to PlaceSearchResult
        const place = googlePlaceToPlace(googlePlace, query);
        placeMap.set(place.id, place);
      }
    }

    // Rate limiting BETWEEN queries (respect Google's limits)
    if (i < API_CONFIG.textQueries.length - 1) {
      await delay(API_CONFIG.rateLimitMs);
    }
  }

  const deduplicatedPlaces = Array.from(placeMap.values());

  // Determine max result count across ALL queries (for subdivision logic)
  const maxResultCount = Math.max(...queryResults.map((r) => r.resultCount), 0);

  // LAYER 2: Handle subdivision if ANY query exceeded threshold
  let childCells: GridPointMessage[] = [];
  const needsSubdivision =
    maxResultCount >= SUBDIVISION_CONFIG.threshold && (gridPoint.subdivisionDepth || 0) < SUBDIVISION_CONFIG.maxDepth;

  if (needsSubdivision) {
    // SAFETY: Check minimum cell size before subdivision
    const childCellSideKm = gridPoint.cellSideKm / 2;
    const childCellSideM = childCellSideKm * 1000;

    if (childCellSideM >= SUBDIVISION_CONFIG.minRadiusM) {
      childCells = subdivideCell(gridPoint);
    }
  }

  return {
    queryResults, // Per-query breakdown
    places: deduplicatedPlaces, // Deduplicated across all queries
    childCells,
    resultCount: maxResultCount, // Max determines subdivision
    needsSubdivision,
  };
}

// Service Bus output for new photos (to be classified by image-classifier)
const photosOutput = output.serviceBusQueue({
  queueName: SERVICE_BUS_CONFIG.placesQueueName,
  connection: SERVICE_BUS_CONFIG.connectionStringEnvVar,
});

// Service Bus output for grid points (for subdivision queueing)
const gridPointsOutput = output.serviceBusQueue({
  queueName: SERVICE_BUS_CONFIG.gridPointsQueueName,
  connection: SERVICE_BUS_CONFIG.connectionStringEnvVar,
});

app.serviceBusQueue("placeSearch", {
  connection: SERVICE_BUS_CONFIG.connectionStringEnvVar,
  queueName: SERVICE_BUS_CONFIG.gridPointsQueueName,
  handler: placeSearchHandler,
  extraOutputs: [photosOutput, gridPointsOutput],
});

export async function placeSearchHandler(message: GridPointMessage, context: InvocationContext): Promise<void> {
  // Validate environment variables before execution
  validateEnvironmentVariables();

  const startTime = Date.now();
  const depth = message.subdivisionDepth || 0;

  context.log(`Place Search started for grid point ${message.id}`);
  context.log(`Coordinates: [${String(message.coordinates[0])}, ${String(message.coordinates[1])}]`);
  context.log(`Cell: ${message.cellSideKm.toFixed(2)}km, ` + `Depth: ${String(depth)}`);
  context.log(`Queries: ${API_CONFIG.textQueries.join(", ")}`); // Log queries

  try {
    // Use shared business logic (now multi-query aware)
    const result = await processGridPointLogic(message);

    // Log per-query results
    context.log(`Executed ${String(result.queryResults.length)} queries:`);
    for (const qr of result.queryResults) {
      context.log(`  - "${qr.query}": ${String(qr.resultCount)} results`);
    }

    const totalResults = result.queryResults.reduce((sum, qr) => sum + qr.resultCount, 0);
    const uniquePlaces = result.places.length;
    const deduplicationRate = calculateDeduplicationRate(uniquePlaces, totalResults);

    context.log(
      `Found ${String(totalResults)} places total, ${String(uniquePlaces)} unique (${deduplicationRate}% deduplicated). ` +
        `Subdivision needed: ${String(result.needsSubdivision)}`
    );

    // Production-specific: Database writes and photo queueing
    const newPhotosMessages: NewPhotosMessage[] = [];

    // Batch Upsert: Save all unique places (already mapped and deduplicated by processGridPointLogic)
    // upsertPlaces uses Promise.allSettled internally for concurrency
    const upsertResults = await upsertPlaces(result.places);

    const upsertedCount = upsertResults.success;
    if (upsertResults.failed > 0) {
      context.warn(`Failed to upsert ${upsertResults.failed} places out of ${result.places.length}`);
    }

    // Queue new photos (using the already mapped places)
    for (const place of result.places) {
      const uncategorizedPhotos = place.photos.uncategorized;
      if (uncategorizedPhotos && uncategorizedPhotos.length > 0) {
        // Double check just in case, though Map logic ensures uniqueness
        const alreadyQueued = newPhotosMessages.some((m) => m.id === place.id);
        if (!alreadyQueued) {
          newPhotosMessages.push({
            id: place.id,
            photos: uncategorizedPhotos,
          });
        }
      }
    }

    // Production-specific: Queue child cells via Service Bus
    if (result.childCells.length > 0) {
      context.log(
        `Subdividing ${message.id} into ${String(result.childCells.length)} child cells at depth ${String(depth + 1)}`
      );
      context.extraOutputs.set(gridPointsOutput, result.childCells);
      context.log(`Queued ${String(result.childCells.length)} child cells for subdivision`);
    } else if (result.needsSubdivision) {
      // Log if subdivision was needed but blocked by safety check
      context.log(`Subdivision limit reached for ${message.id} - cannot subdivide further`);
    }

    // Production-specific: Queue photos for classification
    if (newPhotosMessages.length > 0) {
      context.extraOutputs.set(photosOutput, newPhotosMessages);
      context.log(`Queued ${String(newPhotosMessages.length)} places for photo classification`);
    }

    const duration = Date.now() - startTime;

    // Log enhanced metrics for monitoring
    context.log("METRICS", {
      gridPointId: message.id,
      depth,
      queries: result.queryResults.map((qr) => ({
        query: qr.query,
        count: qr.resultCount,
      })),
      totalResults: totalResults,
      uniquePlaces: uniquePlaces,
      deduplicationRate: parseFloat(deduplicationRate),
      subdivided: result.needsSubdivision,
      placesUpserted: upsertedCount,
      duration,
      apiCallsUsed: API_CONFIG.textQueries.length,
    });

    context.log(
      `Place Search completed for grid point ${message.id}: ` +
        `${String(upsertedCount)} places upserted in ${String(duration)}ms`
    );
  } catch (error) {
    context.error(`Place Search failed for grid point ${message.id}:`, error);
    throw error; // Re-throw to trigger Service Bus retry
  }
}
