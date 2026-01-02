/**
 * Use Google Places Text Search (New) to find places
 * later: find additional photos with serpapi.com
 */

import { Container, CosmosClient, PartitionKeyKind, SpatialType } from "@azure/cosmos";
import { app, InvocationContext, output, Timer } from "@azure/functions";
import type { Place } from "doner_types";
import { PaymentMethods } from "doner_types";
import { GridService } from "../services/grid.service";
import { GridCell } from "../types/grid";
import { GoogleMapsService } from "../services/google-maps.service";

const COSMOSDB_DATABASE_CONNECTION_STRING = process.env.PLACE_SEARCH_COSMOSDB_CONNECTION_STRING ?? "";
const COSMOSDB_DATABASE_NAME = process.env.PLACE_SEARCH_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";
const COSMOSDB_CONTAINER_NAME = process.env.PLACE_SEARCH_COSMOSDB_CONTAINER_NAME ?? "Places";
const client = new CosmosClient(COSMOSDB_DATABASE_CONNECTION_STRING);

app.timer("placeSearch", {
  schedule: process.env.PLACE_SEARCH_CRON ?? "0 */15 * * * *",
  handler: placeSearch,
  extraOutputs: [
    output.serviceBusQueue({
      queueName: "places",
      connection: "PLACE_SEARCH_SERVICEBUS_CONNECTION_STRING",
    }),
  ],
});

export async function placeSearch(myTimer: Timer, context: InvocationContext): Promise<string | undefined> {
  context.log("Place Search function ran at", new Date().toISOString());
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
        includedPaths: [
          {
            path: "/*",
          },
        ],
        spatialIndexes: [
          {
            path: "/geometry/*",
            types: ["Polygon"] as SpatialType[],
          } as any,
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

  context.log(`Processing cell ${cell.id} at level ${cell.level}`);

  // 3. Mark as processing
  await gridService.markAsProcessing(cell);

  const googleMapsService = new GoogleMapsService(
    process.env.GOOGLE_PLACES_API_KEY ?? "",
    process.env.PLACE_SEARCH_DRY_RUN === "true"
  );

  context.log(`Searching for places in cell ${cell.id}...`);
  const googlePlaces = await googleMapsService.searchAllPages(
    cell.boundaryBox.minLat,
    cell.boundaryBox.minLon,
    cell.boundaryBox.maxLat,
    cell.boundaryBox.maxLon
  );

  context.log(`Found ${googlePlaces.length} places.`);

  const messages: any[] = [];

  for (const googlePlace of googlePlaces) {
    const place = googleMapsService.mapGooglePlaceToPlace(googlePlace);
    const isNewOrUpdated = await createOrUpdateItem(placesContainer, place);
    
    if (isNewOrUpdated) {
      messages.push({
        id: place.id,
        photos: place.photos.uncategorized,
      });
    }
  }

  // Update cell results and determine if split is needed
  cell.resultsCount = googlePlaces.length;
  cell.foundPlaceIds = googlePlaces.map(p => p.id);

  if (googlePlaces.length >= 60) {
    context.log(`Cell ${cell.id} has ${googlePlaces.length} results. Splitting...`);
    await gridService.splitCell(cell);
  } else {
    cell.status = "COMPLETED";
    await gridCellsContainer.items.upsert(cell);
  }

  if (messages.length > 0) {
    context.extraOutputs.set(
      output.serviceBusQueue({
        queueName: "places",
        connection: "PLACE_SEARCH_SERVICEBUS_CONNECTION_STRING",
      }),
      messages
    );
    context.log(`Sent ${messages.length} places to Service Bus.`);
  }

  return;
}

async function createOrUpdateItem(container: Container, itemBody: Place): Promise<boolean> {
  const { resource: existingItem } = await container.item(itemBody.id, itemBody.id).read<Place>();

  if (!existingItem) {
    await container.items.create(itemBody);
    return true;
  }

  // Check if anything meaningful changed (simplified for now)
  // In a real app, we might compare lastUpdateTime from Google
  
  // Merge photos
  const mergedPhotos = {
    uncategorized: [...(existingItem.photos.uncategorized ?? []), ...(itemBody.photos.uncategorized ?? [])].filter(
      (photo, index, self) => index === self.findIndex((p) => p.id === photo.id)
    ),
    food: [...(existingItem.photos.food ?? []), ...(itemBody.photos.food ?? [])].filter(
      (photo, index, self) => index === self.findIndex((p) => p.id === photo.id)
    ),
    places: [...(existingItem.photos.places ?? []), ...(itemBody.photos.places ?? [])].filter(
      (photo, index, self) => index === self.findIndex((p) => p.id === photo.id)
    ),
  };

  const updatedItem = {
    ...existingItem, // Keep existing fields like ai_analysis
    ...itemBody,     // Overwrite with new data from Google
    photos: mergedPhotos,
  };

  await container.items.upsert(updatedItem);
  return true; // For now always return true to trigger analysis, can be optimized later
}
