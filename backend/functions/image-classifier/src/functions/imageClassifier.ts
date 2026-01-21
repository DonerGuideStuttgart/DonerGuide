import { Container, CosmosClient } from "@azure/cosmos";
import { app, InvocationContext, output } from "@azure/functions";
import type { PhotoClassificationMessage, Place } from "doner_types";
import { BlobService } from "../services/BlobService";
import { VisionService } from "../services/VisionService";

const COSMOSDB_DATABASE_NAME = process.env.IMAGE_CLASSIFIER_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";
const COSMOSDB_CONTAINER_NAME = process.env.IMAGE_CLASSIFIER_COSMOSDB_CONTAINER_NAME ?? "Places";

let client: CosmosClient | undefined;
let blobService: BlobService | undefined;
let visionService: VisionService | undefined;

import { DefaultAzureCredential } from "@azure/identity";

/**
 * Lazy initialization of services to avoid top-level side effects and enable easier testing.
 */
function initializeServices() {
  if (!client) {
    const endpoint = process.env.IMAGE_CLASSIFIER_COSMOSDB_ENDPOINT ?? "";
    const key = process.env.IMAGE_CLASSIFIER_COSMOSDB_KEY;

    if (!endpoint) {
      throw new Error("IMAGE_CLASSIFIER_COSMOSDB_ENDPOINT is required");
    }

    if (key) {
      client = new CosmosClient({ endpoint, key });
    } else {
      client = new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
    }
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
  message: PhotoClassificationMessage,
  context: InvocationContext
): Promise<{ storeId: string } | undefined> {
  const { storeId, photoId, url } = message;
  const startTime = Date.now();

  context.log(`Image Classifier: Processing photo ${photoId} for store ${storeId}`);

  try {
    // Validate input
    if (!storeId || typeof storeId !== "string") {
      context.error("Invalid storeId in message");
      return undefined;
    }

    if (!photoId || !url) {
      context.error("Invalid photoId or url in message");
      return undefined;
    }

    // Ensure services are initialized
    const { client: cosmosClient, blobService: bs, visionService: vs } = initializeServices();
    const useSproc = process.env.IMAGE_CLASSIFIER_USE_SPROC !== "false";

    // Initialize database connection
    const database = cosmosClient.database(COSMOSDB_DATABASE_NAME);
    const container = database.container(COSMOSDB_CONTAINER_NAME);

    // Ensure SP exists (only if not using workaround)

    // 1. Idempotency Check: Read the Place to see if it's already classified
    const { resource: place } = await container.item(storeId, storeId).read<Place>();
    if (!place) {
      context.error(`Place ${storeId} not found`);
      return undefined;
    }

    const existingPhoto = place.photos.find((p) => p.id === photoId);
    if (existingPhoto && existingPhoto.category !== "uncategorized") {
      context.log(`Photo ${photoId} already classified as ${existingPhoto.category}. skipping.`);
      return { storeId };
    }

    // 2. Download and Analyze
    await bs.ensureContainerExists();
    const { contentType, buffer } = await bs.downloadAndUploadImage(url, photoId);
    const analysis = await vs.analyzeImage(buffer);

    const finalCategory = analysis.category;
    if (finalCategory === "discard") {
      context.log(`Photo ${photoId} discarded by vision analysis.`);
      await bs.deleteImage(photoId);
    }

    context.log(`Photo ${photoId} classified as ${finalCategory} (${String(analysis.confidence)})`);

    // 3. Atomic Update (Stored Procedure vs Client-Side Fallback)
    let isComplete = false;

    if (useSproc) {
      context.log("Using Stored Procedure for atomic update...");
      const spResult = await container.scripts.storedProcedure("patchPhoto").execute(storeId, [
        storeId,
        photoId,
        {
          category: finalCategory,
          confidence: analysis.confidence,
          mimeType: contentType,
        },
      ]);
      const resultBody = spResult.resource as { storeId: string; isComplete: boolean };
      isComplete = resultBody.isComplete;
    } else {
      context.log("Using Client-Side Fallback (OCC) for update...");
      isComplete = await patchPhotoClientSide(container, storeId, photoId, {
        category: finalCategory,
        confidence: analysis.confidence,
        mimeType: contentType,
      });
    }

    // 4. Trigger next step if all photos are done
    if (isComplete) {
      context.log(`All photos for store ${storeId} are processed. Triggering downstream.`);
      const duration = Date.now() - startTime;
      context.log(`Finished processing store ${storeId} in ${String(duration)}ms`);
      return { storeId };
    }

    const duration = Date.now() - startTime;
    context.log(`Finished processing store ${storeId} in ${String(duration)}ms`);
    return undefined; // Do not trigger output queue yet
  } catch (error) {
    const duration = Date.now() - startTime;
    context.error(`Error in imageClassifier for store ${storeId} after ${String(duration)}ms:`, error);
    throw error;
  }
}

/**
 * Client-side fallback for updating a photo and checking completeness using OCC.
 * Used when Stored Procedures are not supported (e.g., local emulator).
 */
async function patchPhotoClientSide(
  container: Container,
  storeId: string,
  photoId: string,
  analysisResult: { category: "food" | "place" | "discard"; confidence: number; mimeType: string }
): Promise<boolean> {
  const maxAttempts = 5;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const { resource: place, etag } = await container.item(storeId, storeId).read<Place>();
    if (!place) throw new Error(`Place ${storeId} not found during update`);

    // Update or remove photo
    const photoIndex = place.photos.findIndex((p) => p.id === photoId);
    if (photoIndex !== -1) {
      if (analysisResult.category === "discard") {
        place.photos.splice(photoIndex, 1);
      } else {
        const photo = place.photos[photoIndex];
        photo.category = analysisResult.category as "food" | "place" | "uncategorized";
        photo.confidence = analysisResult.confidence;
        photo.mimeType = analysisResult.mimeType;
      }
    }

    // Check completeness
    const pendingCount = place.photos.filter((p) => p.category === "uncategorized").length;
    place.lastUpdated = new Date().toISOString();

    try {
      await container.item(storeId, storeId).replace(place, { accessCondition: { type: "IfMatch", condition: etag } });
      return pendingCount === 0;
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 412) {
        attempts++;
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Failed to update photo ${photoId} in store ${storeId} after ${maxAttempts.toString()} attempts due to conflict.`
  );
}
