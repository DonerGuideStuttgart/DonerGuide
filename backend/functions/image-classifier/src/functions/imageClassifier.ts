import { app, InvocationContext, output } from '@azure/functions';

const SERVICEBUS_CONNECTION_STRING_INPUT = process.env['IMAGE_CLASSIFIER_SERVICEBUS_CONNECTION_STRING_INPUT'] || '';
const QUEUE_NAME_INPUT = process.env['IMAGE_CLASSIFIER_QUEUE_NAME_INPUT'] || 'places';
const SERVICEBUS_CONNECTION_STRING_OUTPUT = process.env['IMAGE_CLASSIFIER_SERVICEBUS_CONNECTION_STRING_OUTPUT'] || '';
const QUEUE_NAME_OUTPUT = process.env['IMAGE_CLASSIFIER_QUEUE_NAME_OUTPUT'] || 'classified-images';
const COSMOSDB_DATABASE_CONNECTION_STRING = process.env["IMAGE_CLASSIFIER_COSMOSDB_CONNECTION_STRING"] || "";
const COSMOSDB_DATABASE_NAME = process.env["IMAGE_CLASSIFIER_COSMOSDB_DATABASE_NAME"] || "DoenerGuideDB";
const COSMOSDB_CONTAINER_NAME = process.env["IMAGE_CLASSIFIER_COSMOSDB_CONTAINER_NAME"] || "Places";
const client = new CosmosClient(COSMOSDB_DATABASE_CONNECTION_STRING);

app.serviceBusQueue('serviceBusQueueTrigger1', {
    connection: SERVICEBUS_CONNECTION_STRING_INPUT,
    queueName: QUEUE_NAME_INPUT,
    handler: imageClassifier,
    return: output.serviceBusQueue({
        queueName: QUEUE_NAME_OUTPUT,
        connection: SERVICEBUS_CONNECTION_STRING_OUTPUT
    })
});

export async function imageClassifier(message: string, context: InvocationContext): Promise<string> {
    return message
}