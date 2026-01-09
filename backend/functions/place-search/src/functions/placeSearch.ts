/**
 * Use Google Places Text Search (New) to find places
 * later: find additional photos with serpapi.com
 */

import { Container, CosmosClient, PartitionKeyKind, SpatialType } from "@azure/cosmos";
import { app, InvocationContext, output, Timer } from "@azure/functions";
import type { Place } from "doner_types";
import { GridService } from "../services/grid.service";
import { GoogleMapsService } from "../services/google-maps.service";

const COSMOSDB_DATABASE_CONNECTION_STRING = process.env.PLACE_SEARCH_COSMOSDB_CONNECTION_STRING ?? "";
const COSMOSDB_DATABASE_NAME = process.env.PLACE_SEARCH_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";
const client = new CosmosClient(COSMOSDB_DATABASE_CONNECTION_STRING);

const serviceBusOutput = output.serviceBusQueue({
  queueName: "places",
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
          spatialIndexes: [
            {
              path: "/geometry/*",
              types: ["Polygon"] as SpatialType[],
            } as {
              path: string;
              types: SpatialType[];
              boundingBox: { xmin: number; ymin: number; xmax: number; ymax: number };
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
    const messages: { id: string; photos: unknown[] }[] = [];

    for (const googlePlace of googlePlaces) {
      try {
        if (typeof googlePlace !== "object" || googlePlace === null) {
          continue;
        }
        const place = googleMapsService.mapGooglePlaceToPlace(googlePlace as Record<string, unknown>);
        const { created, updated } = await createOrUpdateItem(placesContainer, place);

        if (created || updated) {
          if (created) newPlacesCount++;
          if (updated) updatedPlacesCount++;

          messages.push({
            id: place.id,
            photos: place.photos,
          });
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

    if (messages.length > 0) {
      context.extraOutputs.set(serviceBusOutput, messages);
      context.log(`Sent ${String(messages.length)} places to Service Bus for photo processing.`);
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
): Promise<{ created: boolean; updated: boolean }> {
  const { resource: existingItem } = await container.item(itemBody.id, itemBody.id).read<Place>();

  if (!existingItem) {
    itemBody.lastUpdated = new Date().toISOString();
    await container.items.create(itemBody);
    return { created: true, updated: false };
  }

  // Merge photos with deduplication, preserving existing classifications
  const mergedPhotos = [...existingItem.photos, ...itemBody.photos].filter(
    (photo, index, self) => index === self.findIndex((p) => p.id === photo.id)
  );

  // Check if anything meaningful changed
  const hasNewPhotos = mergedPhotos.length > existingItem.photos.length;

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
    return { created: false, updated: false };
  }

  const updatedItem: Place = {
    ...itemBody,
    ai_analysis: existingItem.ai_analysis, // Preserve AI analysis
    photos: mergedPhotos,
    lastUpdated: new Date().toISOString(),
  };

  await container.items.upsert(updatedItem);
  return { created: false, updated: true };
}
