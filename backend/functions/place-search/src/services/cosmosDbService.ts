/**
 * Cosmos DB service for Place storage and retrieval
 */

import { Container, CosmosClient, PartitionKeyKind } from "@azure/cosmos";
import type { Place, Photo } from "doner_types";
import type { PlaceSearchResult } from "../types/placeSearchResult.types";
import { COSMOS_CONFIG } from "../config/infraConfig";

let containerInstance: Container | null = null;

/**
 * Initialize Cosmos DB container (creates if not exists)
 * Uses singleton pattern to avoid multiple connections
 */
async function getContainer(): Promise<Container> {
  if (containerInstance) {
    return containerInstance;
  }

  const client = new CosmosClient(COSMOS_CONFIG.connectionString);

  const database = (
    await client.databases.createIfNotExists({
      id: COSMOS_CONFIG.databaseName,
    })
  ).database;

  containerInstance = (
    await database.containers.createIfNotExists({
      id: COSMOS_CONFIG.placesContainerName,
      partitionKey: {
        paths: ["/id"],
        kind: PartitionKeyKind.Hash,
      },
    })
  ).container;

  return containerInstance;
}

/**
 * Get all existing place IDs for deduplication
 */
export async function getAllPlaceIds(): Promise<string[]> {
  const container = await getContainer();

  const { resources } = await container.items.query<{ id: string }>("SELECT c.id FROM c").fetchAll();

  return resources.map((r) => r.id);
}

/**
 * Get a single place by ID
 */
export async function getPlaceById(id: string): Promise<Place | null> {
  const container = await getContainer();

  try {
    const { resource } = await container.item(id, id).read<Place>();
    return resource ?? null;
  } catch {
    return null;
  }
}

/**
 * Upsert a place - creates new or updates existing
 * Handles photo merging to preserve existing data
 * Note: foundViaQueries is not persisted to the database (it's only used during search)
 */
export async function upsertPlace(placeSearchResult: PlaceSearchResult): Promise<void> {
  const container = await getContainer();

  // Check if place already exists
  const existingPlace = await getPlaceById(placeSearchResult.id);

  // Extract Place object (without foundViaQueries) from PlaceSearchResult
  const { foundViaQueries: _foundViaQueries, ...place } = placeSearchResult;

  if (existingPlace) {
    // Merge photos from existing place with new photos
    const mergedPhotos = mergePhotos(existingPlace.photos, place.photos);

    const updatedPlace: Place = {
      ...place,
      photos: mergedPhotos,
    };

    await container.items.upsert(updatedPlace);
  } else {
    // New place - save without foundViaQueries
    await container.items.upsert(place);
  }
}

/**
 * Upsert multiple places with error handling
 * Returns count of successful upserts
 */
export async function upsertPlaces(places: PlaceSearchResult[]): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(places.map((place) => upsertPlace(place)));

  const success = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return { success, failed };
}

/**
 * Merge photo arrays, removing duplicates by photo ID
 */
function mergePhotos(existing: Place["photos"], incoming: Place["photos"]): Place["photos"] {
  const mergePhotoArrays = (existingPhotos: Photo[] | undefined, incomingPhotos: Photo[] | undefined): Photo[] => {
    const combined = [...(existingPhotos ?? []), ...(incomingPhotos ?? [])];
    // Remove duplicates based on photo id
    return combined.filter((photo, index, self) => index === self.findIndex((p) => p.id === photo.id));
  };

  return {
    uncategorized: mergePhotoArrays(existing.uncategorized, incoming.uncategorized),
    food: mergePhotoArrays(existing.food, incoming.food),
    places: mergePhotoArrays(existing.places, incoming.places),
  };
}
