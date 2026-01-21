import { CosmosClient, Item } from "@azure/cosmos";
import { app, InvocationContext } from "@azure/functions";
import { Place } from "doner_types";
import { AzureOpenAI } from "openai";
import { analyzeImage } from "../helper/analyzeImage";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { getImages } from "../helper/getImages";
import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
import { StorageSharedKeyCredential } from "@azure/storage-blob";

const QUEUE_NAME_INPUT = process.env.LLM_ANALYZER_SERVICEBUS_QUEUE_NAME_INPUT ?? "classified-images";

const COSMOSDB_ENDPOINT = process.env.LLM_ANALYZER_COSMOSDB_ENDPOINT ?? "";
const COSMOSDB_KEY = process.env.LLM_ANALYZER_COSMOSDB_KEY;
const COSMOSDB_DATABASE_NAME = process.env.LLM_ANALYZER_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";
const COSMOSDB_CONTAINER_NAME = process.env.LLM_ANALYZER_COSMOSDB_CONTAINER_NAME ?? "Places";

const STORAGE_ENDPOINT = process.env.LLM_ANALYZER_STORAGE_ENDPOINT ?? "";
const STORAGE_ACCOUNT_NAME = process.env.LLM_ANALYZER_STORAGE_ACCOUNT_NAME;
const STORAGE_KEY = process.env.LLM_ANALYZER_STORAGE_KEY;
const STORAGE_CONTAINER_NAME = process.env.LLM_ANALYZER_STORAGE_CONTAINER_NAME ?? "photos";

const FOUNDRY_ENDPOINT = process.env.LLM_ANALYZER_FOUNDRY_ENDPOINT ?? "";
const FOUNDRY_API_KEY = process.env.LLM_ANALYZER_FOUNDRY_API_KEY ?? "";
const FOUNDRY_DEPLOYMENT_NAME = process.env.LLM_ANALYZER_FOUNDRY_DEPLOYMENT_NAME ?? "gpt-5-mini";

let client: CosmosClient;
if (COSMOSDB_KEY) {
  client = new CosmosClient({ endpoint: COSMOSDB_ENDPOINT, key: COSMOSDB_KEY });
} else {
  client = new CosmosClient({ endpoint: COSMOSDB_ENDPOINT, aadCredentials: new DefaultAzureCredential() });
}

const aiClient = new AzureOpenAI({
  endpoint: FOUNDRY_ENDPOINT,
  apiVersion: "2025-04-01-preview",
  deployment: FOUNDRY_DEPLOYMENT_NAME,
  ...(FOUNDRY_API_KEY
    ? { apiKey: FOUNDRY_API_KEY }
    : {
        azureADTokenProvider: getBearerTokenProvider(
          new DefaultAzureCredential(),
          "https://cognitiveservices.azure.com/.default"
        ),
      }),
});

let containerClient: ContainerClient;

if (STORAGE_ENDPOINT) {
  let blobServiceClient: BlobServiceClient;
  if (STORAGE_ACCOUNT_NAME && STORAGE_KEY) {
    const credential = new StorageSharedKeyCredential(STORAGE_ACCOUNT_NAME, STORAGE_KEY);
    blobServiceClient = new BlobServiceClient(STORAGE_ENDPOINT, credential);
  } else {
    blobServiceClient = new BlobServiceClient(STORAGE_ENDPOINT, new DefaultAzureCredential());
  }
  containerClient = blobServiceClient.getContainerClient(STORAGE_CONTAINER_NAME);
} else {
  // Fallback (or throw error)
  const STORAGE_CONNECTION_STRING = process.env.LLM_ANALYZER_STORAGE_CONNECTION_STRING ?? "";
  containerClient =
    BlobServiceClient.fromConnectionString(STORAGE_CONNECTION_STRING).getContainerClient(STORAGE_CONTAINER_NAME);
}

app.serviceBusQueue("llmAnalyzer", {
  connection: "LLM_ANALYZER_SERVICEBUS_CONNECTION_STRING_INPUT",
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
