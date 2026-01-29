/* import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import type { Place } from "doner_types";

const COSMOSDB_ENDPOINT = process.env.COSMOSDB_ENDPOINT ?? "";
const COSMOSDB_KEY = process.env.COSMOSDB_KEY;
const COSMOSDB_DATABASE_NAME = process.env.COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";

let client: CosmosClient;
if (COSMOSDB_KEY) {
  client = new CosmosClient({ endpoint: COSMOSDB_ENDPOINT, key: COSMOSDB_KEY });
} else {
  client = new CosmosClient({ endpoint: COSMOSDB_ENDPOINT, aadCredentials: new DefaultAzureCredential() });
}

function getClient(): CosmosClient {
  if (!client) {
    const endpoint = process.env.COSMOSDB_ENDPOINT;
    const key = process.env.COSMOSDB_KEY;
    if (!endpoint) {
      throw new Error("COSMOSDB_ENDPOINT is not defined");
    }
    client = key
      ? new CosmosClient({ endpoint, key })
      : new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
  }
  return client;
}

export async function getShopById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = request.params.id;
  context.log(`Get shop by ID: ${id}`);

  if (!id) {
    return { status: 400, jsonBody: { error: "Shop ID is required" } };
  }

  try {
    const database = getClient().database(COSMOSDB_DATABASE_NAME);
    const container = database.container("Places");
    const { resource: place } = await container.item(id, id).read<Place>();

    if (!place) {
      return { status: 404, jsonBody: { error: "Shop not found" } };
    }

    return { status: 200, jsonBody: place };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    context.error(`Error retrieving shop ${id}: ${errorMessage}`);
    return { status: 500, jsonBody: { error: "Internal Server Error" } };
  }
}

app.http("getShopById", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "shops/{id}",
  handler: getShopById,
});
 */
