import { CosmosClient } from "@azure/cosmos";
import { app, InvocationContext, output } from "@azure/functions";
import type { NewPhotosMessage, Photo, Place } from "doner_types";
import { BlobService } from "../services/BlobService";
import { VisionService } from "../services/VisionService";

const QUEUE_NAME_INPUT = process.env.IMAGE_CLASSIFIER_SERVICEBUS_QUEUE_NAME_INPUT ?? "places";
const QUEUE_NAME_OUTPUT = process.env.IMAGE_CLASSIFIER_SERVICEBUS_QUEUE_NAME_OUTPUT ?? "classified-images";
const COSMOSDB_DATABASE_CONNECTION_STRING = process.env.IMAGE_CLASSIFIER_COSMOSDB_CONNECTION_STRING ?? "";
const COSMOSDB_DATABASE_NAME = process.env.IMAGE_CLASSIFIER_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";
const COSMOSDB_CONTAINER_NAME = process.env.IMAGE_CLASSIFIER_COSMOSDB_CONTAINER_NAME ?? "Places";

const client = new CosmosClient(COSMOSDB_DATABASE_CONNECTION_STRING);
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

export async function imageClassifier(
  message: NewPhotosMessage,
  context: InvocationContext
): Promise<{ storeId: string } | undefined> {
  const storeId = message.id;
  context.log(`Image Classifier: Processing ${message.photos.length} photos for store ${storeId}`);

  try {
    const database = client.database(COSMOSDB_DATABASE_NAME);
    const container = database.container(COSMOSDB_CONTAINER_NAME);

    // Fetch the current place document
    const { resource: place } = await container.item(storeId, storeId).read<Place>();

    if (!place) {
      context.error(`Place ${storeId} not found in database.`);
      return undefined;
    }

    await blobService.ensureContainerExists();

    const processedPhotos: Photo[] = [];
    const photoIdsToDiscard: string[] = [];

    for (const photoMsg of message.photos) {
      try {
        context.log(`Processing photo ${photoMsg.id}`);

        // 1. Download from Google and Upload to Azure Blob Storage
        const { contentType, buffer } = await blobService.downloadAndUploadImage(photoMsg.url, photoMsg.id);
        
        // 2. Vision Analysis
        const analysis = await visionService.analyzeImage(buffer);

        if (analysis.category === 'discard') {
          context.log(`Photo ${photoMsg.id} discarded by vision analysis.`);
          await blobService.deleteImage(photoMsg.id);
          photoIdsToDiscard.push(photoMsg.id);
        } else {
          context.log(`Photo ${photoMsg.id} classified as ${analysis.category} with confidence ${analysis.confidence}`);
          processedPhotos.push({
            ...photoMsg,
            mimeType: contentType,
            category: analysis.category,
            confidence: analysis.confidence
          });
        }
      } catch (err) {
        context.error(`Failed to process photo ${photoMsg.id}:`, err);
        // We keep the photo as is (uncategorized) or skip it? 
        // According to spec, we should probably just continue with others.
      }
    }

    // Update the place's photos array
    // 1. Remove discarded photos
    // 2. Update metadata for processed photos
    place.photos = place.photos.filter(p => !photoIdsToDiscard.includes(p.id));
    
    place.photos = place.photos.map(p => {
      const processed = processedPhotos.find(pp => pp.id === p.id);
      return processed ? processed : p;
    });

    // Save back to CosmosDB
    await container.item(storeId, storeId).replace(place);

    context.log(`Successfully processed images for store ${storeId}`);
    return { storeId };
  } catch (error) {
    context.error(`Error in imageClassifier for store ${storeId}:`, error);
    throw error;
  }
}
