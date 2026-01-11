import { Container, CosmosClient } from "@azure/cosmos";
import * as fs from "fs";
import * as path from "path";
import { app, InvocationContext, output } from "@azure/functions";
import type { PhotoClassificationMessage, Place } from "doner_types";
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
 * Ensures that the required stored procedure 'patchPhoto' is registered in CosmosDB.
 */
async function ensureStoredProcedure(container: Container) {
  const spId = "patchPhoto";
  try {
    const { resource: sp } = await container.scripts.storedProcedure(spId).read();
    if (sp) return;
  } catch (error: unknown) {
    const errorWithCode = error as { code?: number };
    if (errorWithCode.code !== 404) throw error;
  }

  // Load SP content from file
  const spPath = path.join(__dirname, "..", "db", "sproc", "patchPhoto.js");
  const spContent = fs.readFileSync(spPath, "utf8");

  await container.scripts.storedProcedures.create({
    id: spId,
    body: spContent,
  });
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

    // Initialize database connection
    const database = cosmosClient.database(COSMOSDB_DATABASE_NAME);
    const container = database.container(COSMOSDB_CONTAINER_NAME);

    // Ensure SP exists
    await ensureStoredProcedure(container);

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

    // 3. Atomic Update via Stored Procedure
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

    // 4. Trigger next step if all photos are done
    if (resultBody.isComplete) {
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
