import { CosmosClient } from "@azure/cosmos";
import { app, InvocationContext, output } from "@azure/functions";
import type { NewPhotosMessage, Photo, Place } from "doner_types";
import { BlobService } from "../services/BlobService";
import { VisionService } from "../services/VisionService";

const QUEUE_NAME_INPUT = process.env.IMAGE_CLASSIFIER_SERVICEBUS_QUEUE_NAME_INPUT ?? "places";
const QUEUE_NAME_OUTPUT = process.env.IMAGE_CLASSIFIER_SERVICEBUS_QUEUE_NAME_OUTPUT ?? "classified-images";
const COSMOSDB_CONNECTION_STRING = process.env.IMAGE_CLASSIFIER_COSMOSDB_CONNECTION_STRING ?? "";
const COSMOSDB_DATABASE_NAME = process.env.IMAGE_CLASSIFIER_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";
const COSMOSDB_CONTAINER_NAME = process.env.IMAGE_CLASSIFIER_COSMOSDB_CONTAINER_NAME ?? "Places";

// Validate required environment variables
if (!COSMOSDB_CONNECTION_STRING) {
  throw new Error("IMAGE_CLASSIFIER_COSMOSDB_CONNECTION_STRING is required");
}

const client = new CosmosClient(COSMOSDB_CONNECTION_STRING);
const blobService = new BlobService();
const visionService = new VisionService();

app.serviceBusQueue("imageClassifier", {
  connection: "IMAGE_CLASSIFIER_SERVICEBUS_CONNECTION_STRING_INPUT",
  queueName: QUEUE_NAME_INPUT,
  handler: imageClassifier,
  return: output.serviceBusQueue({
    queueName: QUEUE_NAME_OUTPUT,
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
  context.log(`VisionService config: ${JSON.stringify(visionService.getConfig())}`);

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

    // Initialize database connection
    const database = client.database(COSMOSDB_DATABASE_NAME);
    const container = database.container(COSMOSDB_CONTAINER_NAME);

    // Fetch the current place document
    const { resource: place } = await container.item(storeId, storeId).read<Place>();

    if (!place) {
      context.error(`Place ${storeId} not found in database.`);
      return undefined;
    }

    // Ensure blob container exists
    await blobService.ensureContainerExists();

    // Process each photo
    const processedPhotos: Photo[] = [];
    const photoIdsToDiscard: string[] = [];
    const errors: { photoId: string; error: string }[] = [];

    for (const photoMsg of message.photos) {
      try {
        context.log(`Processing photo ${photoMsg.id} from ${photoMsg.url}`);

        // Validate photo message
        if (!photoMsg.id || !photoMsg.url) {
          throw new Error("Photo missing id or url");
        }

        // 1. Download from Google and Upload to Azure Blob Storage
        const { contentType, buffer } = await blobService.downloadAndUploadImage(photoMsg.url, photoMsg.id);

        // 2. Vision Analysis
        const analysis = await visionService.analyzeImage(buffer);

        if (analysis.category === "discard") {
          context.log(`Photo ${photoMsg.id} discarded by vision analysis (confidence: ${String(analysis.confidence)})`);
          await blobService.deleteImage(photoMsg.id);
          photoIdsToDiscard.push(photoMsg.id);
        } else {
          context.log(
            `Photo ${photoMsg.id} classified as ${analysis.category} with confidence ${String(analysis.confidence)}`
          );
          processedPhotos.push({
            id: photoMsg.id,
            url: photoMsg.url,
            mimeType: contentType,
            category: analysis.category,
            confidence: analysis.confidence,
          });
        }
      } catch (err: unknown) {
        const error = err as Error;
        context.error(`Failed to process photo ${photoMsg.id}:`, error.message);
        errors.push({ photoId: photoMsg.id, error: error.message });

        // Clean up blob if it was uploaded but analysis failed
        try {
          await blobService.deleteImage(photoMsg.id);
        } catch (cleanupError) {
          context.error(`Failed to clean up blob ${photoMsg.id}:`, cleanupError);
        }
      }
    }

    // Update the place's photos array
    // 1. Remove discarded photos
    // 2. Update metadata for processed photos
    place.photos = place.photos.filter((p) => !photoIdsToDiscard.includes(p.id));

    place.photos = place.photos.map((p) => {
      const processed = processedPhotos.find((pp) => pp.id === p.id);
      return processed ?? p;
    });

    // Save back to CosmosDB
    await container.item(storeId, storeId).replace(place);

    const duration = Date.now() - startTime;
    context.log(`Successfully processed images for store ${storeId}`, {
      totalPhotos: message.photos.length,
      processed: processedPhotos.length,
      discarded: photoIdsToDiscard.length,
      errors: errors.length,
      duration: `${String(duration)}ms`,
    });

    // Log errors if any occurred
    if (errors.length > 0) {
      context.warn(`Encountered ${String(errors.length)} errors during processing:`, errors);
    }

    return { storeId };
  } catch (error) {
    const duration = Date.now() - startTime;
    context.error(`Error in imageClassifier for store ${storeId} after ${String(duration)}ms:`, error);
    throw error;
  }
}
