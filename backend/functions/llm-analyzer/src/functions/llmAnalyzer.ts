import { CosmosClient, Item } from "@azure/cosmos";
import { app, InvocationContext } from "@azure/functions";
import { Place } from "doner_types";
import { AzureOpenAI } from "openai";
import { analyzeImage } from "../helper/analyzeImage";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { getImages } from "../helper/getImages";

const QUEUE_NAME_INPUT = process.env.LLM_ANALYZER_SERVICEBUS_QUEUE_NAME_INPUT ?? "classified-images";

const COSMOSDB_DATABASE_CONNECTION_STRING = process.env.LLM_ANALYZER_COSMOSDB_CONNECTION_STRING ?? "";
const COSMOSDB_DATABASE_NAME = process.env.LLM_ANALYZER_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";
const COSMOSDB_CONTAINER_NAME = process.env.LLM_ANALYZER_COSMOSDB_CONTAINER_NAME ?? "Places";

const STORAGE_CONNECTION_STRING = process.env.LLM_ANALYZER_STORAGE_CONNECTION_STRING ?? "";
const STORAGE_CONTAINER_NAME = process.env.LLM_ANALYZER_STORAGE_CONTAINER_NAME ?? "photos";

const FOUNDRY_ENDPOINT = process.env.FOUNDRY_ENDPOINT ?? "";
const FOUNDRY_API_KEY = process.env.FOUNDRY_API_KEY ?? "";
const FOUNDRY_DEPLOYMENT_NAME = process.env.FOUNDRY_DEPLOYMENT_NAME ?? "gpt-5-mini";

const client = new CosmosClient(COSMOSDB_DATABASE_CONNECTION_STRING);

const aiClient = new AzureOpenAI({
  endpoint: FOUNDRY_ENDPOINT,
  apiVersion: "2025-04-01-preview",
  apiKey: FOUNDRY_API_KEY,
  deployment: FOUNDRY_DEPLOYMENT_NAME,
});

const containerClient: ContainerClient =
  BlobServiceClient.fromConnectionString(STORAGE_CONNECTION_STRING).getContainerClient(STORAGE_CONTAINER_NAME);

app.serviceBusQueue("llmAnalyzer", {
  connection: "LLM_ANALYZER_SERVICEBUS_CONNECTION_STRING",
  queueName: QUEUE_NAME_INPUT,
  handler: llmAnalyzer,
});

export async function llmAnalyzer(storeId: { storeId: string }, context: InvocationContext): Promise<void> {
  context.log("LLM Analyzer function ran at", new Date().toISOString());

  const database = (await client.databases.createIfNotExists({ id: COSMOSDB_DATABASE_NAME })).database;
  const container = (
    await database.containers.createIfNotExists({
      id: COSMOSDB_CONTAINER_NAME,
      partitionKey: { paths: ["/id"] },
    })
  ).container;

  const item: Item = container.item(storeId.storeId, storeId.storeId);

  context.log("Store ID found:", storeId);

  const { resource } = await item.read<Place>();
  const images = await getImages(context, containerClient, resource as Place);

  context.log("Images found:", images.length);

  const analysisResult = await analyzeImage(context, aiClient, images);

  await item.patch({
    operations: [
      {
        op: "set",
        path: "/ai_analysis",
        value: analysisResult,
      },
    ],
  });
}
