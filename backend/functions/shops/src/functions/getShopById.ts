import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { mapToStore } from "./mapper";

const COSMOSDB_ENDPOINT = process.env.SHOP_COSMOSDB_ENDPOINT ?? "";
const COSMOSDB_KEY = process.env.SHOP_COSMOSDB_KEY;
const COSMOSDB_DATABASE_NAME = process.env.SHOP_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";
const CONTAINER_ID = process.env.COSMOSDB_CONTAINER_ID || "Places";

let client: CosmosClient;
if (COSMOSDB_KEY) {
  client = new CosmosClient({ endpoint: COSMOSDB_ENDPOINT, key: COSMOSDB_KEY });
} else {
  client = new CosmosClient({ endpoint: COSMOSDB_ENDPOINT, aadCredentials: new DefaultAzureCredential() });
}

export async function getShopById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = request.params.id;
  context.log(`Rufe Details ab für Shop ID: ${id}`);

  if (!id) {
    return { status: 400, jsonBody: { error: "Shop ID is required" } };
  }

  try {
    const database = client.database(COSMOSDB_DATABASE_NAME);
    const container = database.container(CONTAINER_ID);

    // 1. Item direkt per ID lesen (effizienter als Query)
    // Wir gehen davon aus, dass die ID auch der Partition Key ist.
    const { resource: rawItem } = await container.item(id, id).read();

    if (!rawItem) {
      return { status: 404, jsonBody: { error: "Shop not found" } };
    }

    // 2. Mapping anwenden
    // Hier nutzen wir dieselbe Logik wie in der Liste -> Konsistentes Frontend-Modell!
    const sanitizedItem = mapToStore(rawItem);

    return { status: 200, jsonBody: sanitizedItem };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    context.error(`Fehler beim Abrufen von Shop ${id}: ${errorMessage}`);
    return { status: 500, jsonBody: { error: "Internal Server Error" } };
  }
}

app.http("getShopById", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "places/{id}", // Route passend zur OpenAPI (places statt shops)
  handler: getShopById,
});
