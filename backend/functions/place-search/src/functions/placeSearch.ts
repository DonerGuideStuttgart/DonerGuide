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
    context.extraOutputs.set(serviceBusOutput, messages);
    context.log(`Sent ${messages.length} places to Service Bus.`);
  }

  return;
}

async function createOrUpdateItem(container: Container, itemBody: Place): Promise<boolean> {
  const { resource: existingItem } = await container.item(itemBody.id, itemBody.id).read<Place>();

  if (!existingItem) {
    itemBody.lastUpdated = new Date().toISOString();
    await container.items.create(itemBody);
    return true;
  }

  // Merge photos with deduplication
  const mergedPhotos = {
    uncategorized: [...(existingItem.photos?.uncategorized ?? []), ...(itemBody.photos?.uncategorized ?? [])].filter(
      (photo, index, self) => index === self.findIndex((p) => p.id === photo.id)
    ),
    food: existingItem.photos?.food ?? [],
    places: existingItem.photos?.places ?? [],
  };

  // Check if anything meaningful changed
  // We compare number of uncategorized photos and some basic fields
  const hasNewPhotos = (mergedPhotos.uncategorized?.length ?? 0) > (existingItem.photos?.uncategorized?.length ?? 0);
  
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
    return false;
  }

  const updatedItem: Place = {
    ...itemBody,
    ai_analysis: existingItem.ai_analysis, // Preserve AI analysis
    photos: mergedPhotos,
    lastUpdated: new Date().toISOString(),
  };

  await container.items.upsert(updatedItem);
  return true;
}
