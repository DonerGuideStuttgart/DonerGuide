import { CosmosClient, Item } from "@azure/cosmos";
import { app, InvocationContext } from "@azure/functions";

const QUEUE_NAME_INPUT = process.env.LLM_ANALYZER_SERVICEBUS_QUEUE_NAME_INPUT ?? "classified-images";
const COSMOSDB_DATABASE_CONNECTION_STRING = process.env.LLM_ANALYZER_COSMOSDB_CONNECTION_STRING ?? "";
const COSMOSDB_DATABASE_NAME = process.env.LLM_ANALYZER_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";
const COSMOSDB_CONTAINER_NAME = process.env.LLM_ANALYZER_COSMOSDB_CONTAINER_NAME ?? "Places";
const client = new CosmosClient(COSMOSDB_DATABASE_CONNECTION_STRING);

app.serviceBusQueue("imageClassifier", {
  connection: "LLM_ANALYZER_SERVICEBUS_CONNECTION_STRING",
  queueName: QUEUE_NAME_INPUT,
  handler: llmAnalyzer,
});

export async function llmAnalyzer(storeId: string, context: InvocationContext): Promise<void> {
  context.log("LLM Analyzer function ran at", new Date().toISOString());
  const database = (await client.databases.createIfNotExists({ id: COSMOSDB_DATABASE_NAME })).database;
  const container = (
    await database.containers.createIfNotExists({
      id: COSMOSDB_CONTAINER_NAME,
      partitionKey: { paths: ["/id"] },
    })
  ).container;

  const item: Item = container.item(storeId, storeId);

  await item.patch({
    operations: [
      {
        op: "add",
        path: "/ai_analysis",
        value: {
          score: 85,
          meat_ratio: 70,
          sauce_amount: 60,
          size: 75,
          waiting_time: "AVERAGE",
          image_URL: "https://example.com/analyzed_image.jpg",
          price: 8.5,
          text: "The doner is well-balanced with a good amount of meat and sauce. The portion size is satisfying, and the waiting time is average.",
        },
      },
    ],
  });
}
