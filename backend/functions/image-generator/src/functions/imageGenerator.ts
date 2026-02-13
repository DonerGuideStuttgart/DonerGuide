import { app, InvocationContext } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobService } from "../services/BlobService";
import { GenAIService } from "../services/GenAIService";
import { randomUUID } from "node:crypto";
import type { Place, Photo } from "doner_types";

// Service instances (lazy init or top-level)
let cosmosClient: CosmosClient;
let blobService: BlobService;
let genAIService: GenAIService;

function initialize() {
  if (!cosmosClient) {
    const endpoint = process.env.IMAGE_GENERATOR_COSMOSDB_ENDPOINT ?? "http://localhost:8081";
    const key = process.env.IMAGE_GENERATOR_COSMOSDB_KEY; // Optional
    if (key) {
      cosmosClient = new CosmosClient({ endpoint, key });
    } else {
      cosmosClient = new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
    }
  }
  if (!blobService) {
    blobService = new BlobService();
  }
  if (!genAIService) {
    genAIService = new GenAIService();
  }
}

app.serviceBusQueue("imageGenerator", {
  connection: "IMAGE_GENERATOR_SERVICEBUS_CONNECTION_STRING_INPUT",
  queueName: "%IMAGE_GENERATOR_SERVICEBUS_QUEUE_NAME%",
  handler: imageGenerator,
});

export async function imageGenerator(message: unknown, context: InvocationContext): Promise<void> {
  const msg = message as { prompt: string; placeId: string };
  context.log("Processing image generation request", msg);

  if (!msg.prompt || !msg.placeId) {
    context.error("Invalid message: missing prompt or placeId");
    return;
  }

  try {
    initialize();

    // 1. Generate Image
    const imageBuffer = await genAIService.generateImage(msg.prompt);

    // 2. Upload to Blob Storage
    const photoId = randomUUID();
    await blobService.ensureContainerExists();
    const blobUrl = await blobService.uploadImage(photoId, imageBuffer, "image/png");

    // 3. Update Cosmos DB
    const databaseId = process.env.IMAGE_GENERATOR_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";
    const containerId = process.env.IMAGE_GENERATOR_COSMOSDB_CONTAINER_NAME ?? "Places";
    const container = cosmosClient.database(databaseId).container(containerId);

    const { resource: place } = await container.item(msg.placeId, msg.placeId).read<Place>();
    if (!place) {
      context.error(`Place ${msg.placeId} not found`);
      return;
    }

    const newPhoto: Photo = {
      id: photoId,
      url: blobUrl,
      mimeType: "image/png",
      category: "ai_generated",
      confidence: 1.0,
    };

    if (!place.public_photos) {
      place.public_photos = [];
    }
    place.public_photos.push(newPhoto);

    await container.item(msg.placeId, msg.placeId).replace(place);

    context.log(`Successfully generated and saved photo ${photoId} for place ${msg.placeId}`);
  } catch (error) {
    context.error("Error in imageGenerator:", error);
    throw error; // Retry
  }
}
