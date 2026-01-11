import { CosmosClient } from "@azure/cosmos";
import { app, InvocationContext, output } from "@azure/functions";
import type { NewPhotosMessage, Photo, Place } from "doner_types";
import { BlobService } from "../services/BlobService";
import { VisionService } from "../services/VisionService";

const COSMOSDB_DATABASE_NAME = process.env.IMAGE_CLASSIFIER_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";
const COSMOSDB_CONTAINER_NAME = process.env.IMAGE_CLASSIFIER_COSMOSDB_CONTAINER_NAME ?? "Places";

let client: CosmosClient | undefined;
let blobService: BlobService | undefined;
let visionService: VisionService | undefined;

/**
 * Lazy initialization of services to avoid top-level side effects and enable easier testing.
 */
function initializeServices() {
  if (!client) {
    const connectionString = process.env.IMAGE_CLASSIFIER_COSMOSDB_CONNECTION_STRING ?? "";
    if (!connectionString) {
      throw new Error("IMAGE_CLASSIFIER_COSMOSDB_CONNECTION_STRING is required");
    }
    client = new CosmosClient(connectionString);
  }
  blobService ??= new BlobService();
  visionService ??= new VisionService();
  return { client, blobService, visionService };
}

/**
 * Resets the services (used for testing).
 */
export function resetServices() {
  client = undefined;
  blobService = undefined;
  visionService = undefined;
}

app.serviceBusQueue("imageClassifier", {
  connection: "IMAGE_CLASSIFIER_SERVICEBUS_CONNECTION_STRING_INPUT",
  queueName: process.env.IMAGE_CLASSIFIER_SERVICEBUS_QUEUE_NAME_INPUT ?? "places",
  handler: imageClassifier,
  return: output.serviceBusQueue({
    queueName: process.env.IMAGE_CLASSIFIER_SERVICEBUS_QUEUE_NAME_OUTPUT ?? "classified-images",
    connection: "IMAGE_CLASSIFIER_SERVICEBUS_CONNECTION_STRING_OUTPUT",
  }),
});

/**
 * Processes a message from the Service Bus containing new photos to classify.
 * Downloads images, analyzes them with Azure Vision, and updates the database.
 *
 * @param message - The Service Bus message containing store ID and photos
 * @param context - Azure Functions invocation context
 * @returns Object with storeId if successful, undefined if failed
 */
export async function imageClassifier(
  message: NewPhotosMessage,
  context: InvocationContext
): Promise<{ storeId: string } | undefined> {
  const storeId = message.id;
  const startTime = Date.now();

  context.log(`Image Classifier: Processing ${String(message.photos.length)} photos for store ${storeId}`);

  try {
    // Validate input
    if (!storeId || typeof storeId !== "string") {
      context.error("Invalid storeId in message");
      return undefined;
    }

    if (!Array.isArray(message.photos) || message.photos.length === 0) {
      context.warn("No photos in message, skipping");
      return undefined;
    }

    // Ensure services are initialized
    const { client: cosmosClient, blobService: bs, visionService: vs } = initializeServices();

    // Initialize database connection
    const database = cosmosClient.database(COSMOSDB_DATABASE_NAME);
    const container = database.container(COSMOSDB_CONTAINER_NAME);

    // Fetch the current place document
    const { resource: place } = await container.item(storeId, storeId).read<Place>();

    if (!place) {
      context.error(`Place ${storeId} not found in database.`);
      return undefined;
    }

    // Ensure blob container exists
    await bs.ensureContainerExists();

    // Process photos in parallel
    const photoResults = await Promise.allSettled(
      message.photos.map(async (photoMsg) => {
        if (!photoMsg.id || !photoMsg.url) {
          throw new Error("Photo missing id or url");
        }

        context.log(`Processing photo ${photoMsg.id} from ${photoMsg.url}`);

        // 1. Download from Google and Upload to Azure Blob Storage
        const { contentType, buffer } = await bs.downloadAndUploadImage(photoMsg.url, photoMsg.id);

        // 2. Vision Analysis
        const analysis = await vs.analyzeImage(buffer);

        if (analysis.category === "discard") {
          context.log(`Photo ${photoMsg.id} discarded by vision analysis (confidence: ${String(analysis.confidence)})`);
          await bs.deleteImage(photoMsg.id);
          return { id: photoMsg.id, status: "discarded" as const };
        }

        context.log(
          `Photo ${photoMsg.id} classified as ${analysis.category} with confidence ${String(analysis.confidence)}`
        );
        return {
          id: photoMsg.id,
          status: "processed" as const,
          photo: {
            id: photoMsg.id,
            url: photoMsg.url,
            mimeType: contentType,
            category: analysis.category,
            confidence: analysis.confidence,
          } as Photo,
        };
      })
    );

    // Collect results and merge into place document
    const photoIdsToDiscard: string[] = [];
    const updatedPhotosMap = new Map<string, Photo>();

    for (const result of photoResults) {
      if (result.status === "fulfilled") {
        if (result.value.status === "discarded") {
          photoIdsToDiscard.push(result.value.id);
        } else {
          updatedPhotosMap.set(result.value.photo.id, result.value.photo);
        }
      } else {
        context.error(`Failed to process a photo:`, result.reason);
        // Note: we don't have the photoId easily if it failed before validation,
        // but individual catch within map could handle that if needed.
        // For now, we continue with what succeeded.
      }
    }

    // Deep Merge Logic:
    // 1. Remove photos that were discarded in this run
    // 2. Update existing photos or add new ones from this run
    // 3. Keep other photos as they were (uncategorized or previously categorized)

    let photosChanged = false;

    // Filter out discarded photos
    const originalCount = place.photos.length;
    place.photos = place.photos.filter((p) => !photoIdsToDiscard.includes(p.id));
    if (place.photos.length !== originalCount) photosChanged = true;

    // Update or add processed photos
    for (const [id, updatedPhoto] of updatedPhotosMap) {
      const existingIndex = place.photos.findIndex((p) => p.id === id);
      if (existingIndex !== -1) {
        // Deep merge: only update specific fields if needed,
        // but here we trust the classification result
        place.photos[existingIndex] = updatedPhoto;
        photosChanged = true;
      } else {
        place.photos.push(updatedPhoto);
        photosChanged = true;
      }
    }

    // Save back to CosmosDB if changes occurred
    if (photosChanged) {
      await container.item(storeId, storeId).replace(place);
      context.log(
        `Successfully updated ${storeId} with ${String(updatedPhotosMap.size)} processed and ${String(photoIdsToDiscard.length)} discarded images.`
      );
    } else {
      context.log(`No changes needed for ${storeId}.`);
    }

    const duration = Date.now() - startTime;
    context.log(`Finished processing store ${storeId} in ${String(duration)}ms`);

    return { storeId };
  } catch (error) {
    const duration = Date.now() - startTime;
    context.error(`Error in imageClassifier for store ${storeId} after ${String(duration)}ms:`, error);
    throw error;
  }
}
