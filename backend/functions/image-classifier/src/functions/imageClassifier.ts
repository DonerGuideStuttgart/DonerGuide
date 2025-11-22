import { CosmosClient, Item, PatchRequestBody } from '@azure/cosmos';
import { app, InvocationContext, output } from '@azure/functions';
import type { NewPhotosMessage, Photo } from '../../../shared/types/types.ts';

const SERVICEBUS_CONNECTION_STRING_INPUT = process.env['IMAGE_CLASSIFIER_SERVICEBUS_CONNECTION_STRING_INPUT'] || '';
const QUEUE_NAME_INPUT = process.env['IMAGE_CLASSIFIER_QUEUE_NAME_INPUT'] || 'places';
const SERVICEBUS_CONNECTION_STRING_OUTPUT = process.env['IMAGE_CLASSIFIER_SERVICEBUS_CONNECTION_STRING_OUTPUT'] || '';
const QUEUE_NAME_OUTPUT = process.env['IMAGE_CLASSIFIER_QUEUE_NAME_OUTPUT'] || 'classified-images';
const COSMOSDB_DATABASE_CONNECTION_STRING = process.env["IMAGE_CLASSIFIER_COSMOSDB_CONNECTION_STRING"] || "";
const COSMOSDB_DATABASE_NAME = process.env["IMAGE_CLASSIFIER_COSMOSDB_DATABASE_NAME"] || "DoenerGuideDB";
const COSMOSDB_CONTAINER_NAME = process.env["IMAGE_CLASSIFIER_COSMOSDB_CONTAINER_NAME"] || "Places";
const client = new CosmosClient(COSMOSDB_DATABASE_CONNECTION_STRING);

app.serviceBusQueue('imageClassifier', {
    connection: SERVICEBUS_CONNECTION_STRING_INPUT,
    queueName: QUEUE_NAME_INPUT,
    handler: imageClassifier,
    return: output.serviceBusQueue({
        queueName: QUEUE_NAME_OUTPUT,
        connection: SERVICEBUS_CONNECTION_STRING_OUTPUT
    })
});

export async function imageClassifier(message_in: string, context: InvocationContext): Promise<string|undefined> {

    context.log('Place Search function ran at', new Date().toISOString());
    const database = (await client.databases.createIfNotExists({ id: COSMOSDB_DATABASE_NAME })).database;
    const container = (await database.containers.createIfNotExists({ 
        id: COSMOSDB_CONTAINER_NAME,
        partitionKey: { paths: ["/id"] }
    })).container;

    const message: NewPhotosMessage = JSON.parse(message_in);

    const item: Item = container.item(message.id, message.id);

    const patchBody: PatchRequestBody = message.photos.flatMap((photo: Photo) => ([
    {
        op: "set" as const,
        path: `/photos/food/${photo.id}`,
        value: photo.photoUrl
    },
    {
        op: "set" as const,
        path: `/photos/places/${photo.id}`,
        value: photo.photoUrl
    }
    ]));

    await item.patch(patchBody);

    return message.id;
}