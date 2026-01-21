/**
 * Use Google Places Text Search (New) to find places
 * later: find additional photos with serpapi.com
 */

import { Container, CosmosClient, PartitionKeyKind } from "@azure/cosmos";
import { app, InvocationContext, output, Timer } from "@azure/functions";
import type { Photo, PhotoClassificationMessage, Place } from "doner_types";
import { GridService } from "../services/grid.service";
import { GoogleMapsService } from "../services/google-maps.service";

import { DefaultAzureCredential } from "@azure/identity";

const COSMOSDB_ENDPOINT = process.env.PLACE_SEARCH_COSMOSDB_ENDPOINT ?? "";
const COSMOSDB_KEY = process.env.PLACE_SEARCH_COSMOSDB_KEY;
const COSMOSDB_DATABASE_NAME = process.env.PLACE_SEARCH_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";

let client: CosmosClient;
if (COSMOSDB_KEY) {
  client = new CosmosClient({ endpoint: COSMOSDB_ENDPOINT, key: COSMOSDB_KEY });
} else {
  client = new CosmosClient({ endpoint: COSMOSDB_ENDPOINT, aadCredentials: new DefaultAzureCredential() });
}

const serviceBusOutput = output.serviceBusQueue({
  queueName: process.env.PLACE_SEARCH_SERVICEBUS_QUEUE_NAME ?? "places",
  connection: "PLACE_SEARCH_SERVICEBUS_CONNECTION_STRING",
});

app.timer("placeSearch", {
  schedule: process.env.PLACE_SEARCH_CRON ?? "0 */15 * * * *",
  handler: placeSearch,
  extraOutputs: [serviceBusOutput],
});

export async function placeSearch(myTimer: Timer, context: InvocationContext): Promise<string | undefined> {
  try {
    const database = (await client.databases.createIfNotExists({ id: COSMOSDB_DATABASE_NAME })).database;

    // Initialize Places container
    const placesContainer = (
      await database.containers.createIfNotExists({
        id: "Places",
        partitionKey: {
          paths: ["/id"],
          kind: PartitionKeyKind.Hash,
        },
      })
    ).container;

    // Initialize GridCells container with Spatial Index
    const gridCellsContainer = (
      await database.containers.createIfNotExists({
        id: "GridCells",
        partitionKey: {
          paths: ["/id"],
          kind: PartitionKeyKind.Hash,
        },
        indexingPolicy: {
          indexingMode: "consistent",
          automatic: true,
          includedPaths: [
            {
              path: "/*",
            },
          ],
        },
      })
    ).container;

    const GRID_VERSION = process.env.PLACE_SEARCH_GRID_VERSION ?? "v1";
    const gridService = new GridService(gridCellsContainer);

    // 1. Initialize Grid
    await gridService.initializeGrid(GRID_VERSION);

    // 2. Get Next Cell
    const cell = await gridService.getNextCell(GRID_VERSION);
    if (!cell) {
      context.log("No cell to process.");
      return;
    }

    context.log(`Processing cell ${cell.id} at level ${String(cell.level)}`);

    // 3. Mark as processing
    await gridService.markAsProcessing(cell);

    const googleMapsService = new GoogleMapsService(
      process.env.GOOGLE_PLACES_API_KEY ?? "",
      process.env.PLACE_SEARCH_DRY_RUN === "true"
    );

    context.log(`Searching for places in cell ${cell.id}...`);
    let googlePlaces: unknown[] = [];
    try {
      googlePlaces = await googleMapsService.searchAllPages(
        cell.boundaryBox.minLat,
        cell.boundaryBox.minLon,
        cell.boundaryBox.maxLat,
        cell.boundaryBox.maxLon
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      context.error(`Error searching places for cell ${cell.id}: ${errorMessage}`);
      // If it's a quota error, we might want to stop or just fail this cell
      if (errorMessage.includes("429")) {
        context.log("Quota exceeded. Stopping search for this run.");
        return;
      }
      // For other errors, we might want to retry later (keep status PENDING via timeout)
      throw error;
    }

    context.log(`Found ${String(googlePlaces.length)} places in Google Maps.`);

    let newPlacesCount = 0;
    let updatedPlacesCount = 0;
    const photoMessages: PhotoClassificationMessage[] = [];

    for (const googlePlace of googlePlaces) {
      try {
        if (typeof googlePlace !== "object" || googlePlace === null) {
          continue;
        }
        const place = googleMapsService.mapGooglePlaceToPlace(googlePlace as Record<string, unknown>);
        const { created, updated, newPhotos } = await createOrUpdateItem(placesContainer, place);

        if (created || updated) {
          if (created) newPlacesCount++;
          if (updated) updatedPlacesCount++;

          for (const photo of newPhotos) {
            photoMessages.push({
              storeId: place.id,
              photoId: photo.id,
              url: photo.url,
            });
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const placeId =
          typeof googlePlace === "object" && googlePlace !== null && "id" in googlePlace
            ? String((googlePlace as { id: unknown }).id)
            : "unknown";
        context.error(`Error processing place ${placeId}: ${errorMessage}`);
      }
    }

    context.log(
      `Results: ${String(googlePlaces.length)} total, ${String(newPlacesCount)} new, ${String(updatedPlacesCount)} updated.`
    );

    // Update cell results and determine if split is needed
    cell.resultsCount = googlePlaces.length;
    cell.foundPlaceIds = googlePlaces
      .map((p) => {
        if (typeof p === "object" && p !== null && "id" in p) {
          return (p as { id: string }).id;
        }
        return "";
      })
      .filter((id) => id !== "");

    if (googlePlaces.length >= 60) {
      context.log(`Cell ${cell.id} has ${String(googlePlaces.length)} results. Splitting...`);
      await gridService.splitCell(cell);
    } else {
      context.log(`Cell ${cell.id} search completed.`);
      cell.status = "COMPLETED";
      await gridCellsContainer.items.upsert(cell);
    }

    if (photoMessages.length > 0) {
      context.extraOutputs.set(serviceBusOutput, photoMessages);
      context.log(`Sent ${String(photoMessages.length)} photos to Service Bus for classification.`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    context.error(`Error in placeSearch handler: ${errorMessage}`);
  }

  return;
}

async function createOrUpdateItem(
  container: Container,
  itemBody: Place
): Promise<{ created: boolean; updated: boolean; newPhotos: Photo[] }> {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const { resource: existingItem, etag } = await container.item(itemBody.id, itemBody.id).read<Place>();

    if (!existingItem) {
      itemBody.lastUpdated = new Date().toISOString();
      try {
        await container.items.create(itemBody);
        return { created: true, updated: false, newPhotos: itemBody.photos };
      } catch (e: unknown) {
        const errorWithCode = e as { code?: number };
        if (errorWithCode.code === 409) {
          // Conflict: someone just created it
          attempts++;
          continue;
        }
        throw e;
      }
    }

    // Identify new photos (those that don't exist in the DB yet)
    const existingPhotoIds = new Set(existingItem.photos.map((p) => p.id));
    const newPhotos = itemBody.photos.filter((p) => !existingPhotoIds.has(p.id));

    // Merge photos with deduplication, preserving existing classifications and adding ONLY the new ones
    const mergedPhotos = [...existingItem.photos, ...newPhotos];

    // Check if anything meaningful changed
    const hasNewPhotos = newPhotos.length > 0;

    const hasDataChanges =
      existingItem.name !== itemBody.name ||
      existingItem.internationalPhoneNumber !== itemBody.internationalPhoneNumber ||
      JSON.stringify(existingItem.address) !== JSON.stringify(itemBody.address) ||
      JSON.stringify(existingItem.openingHours) !== JSON.stringify(itemBody.openingHours) ||
      existingItem.takeout !== itemBody.takeout ||
      existingItem.delivery !== itemBody.delivery ||
      existingItem.dineIn !== itemBody.dineIn ||
      existingItem.servesVegetarianFood !== itemBody.servesVegetarianFood ||
      JSON.stringify(existingItem.paymentMethods) !== JSON.stringify(itemBody.paymentMethods);

    if (!hasNewPhotos && !hasDataChanges) {
      return { created: false, updated: false, newPhotos: [] };
    }

    const updatedItem: Place = {
      ...itemBody,
      ai_analysis: existingItem.ai_analysis, // Preserve AI analysis
      photos: mergedPhotos,
      lastUpdated: new Date().toISOString(),
    };

    try {
      await container
        .item(itemBody.id, itemBody.id)
        .replace(updatedItem, { accessCondition: { type: "IfMatch", condition: etag } });
      return { created: false, updated: true, newPhotos };
    } catch (e: unknown) {
      const errorWithCode = e as { code?: number };
      if (errorWithCode.code === 412) {
        // Precondition Failed: Document modified since last read
        attempts++;
        continue;
      }
      throw e;
    }
  }

  throw new Error(
    `Failed to update item ${itemBody.id} after ${String(maxAttempts)} attempts due to concurrency conflicts.`
  );
}
