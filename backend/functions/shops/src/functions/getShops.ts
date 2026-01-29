import { CosmosClient, SqlQuerySpec } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";

const COSMOSDB_ENDPOINT = process.env.SHOP_COSMOSDB_ENDPOINT ?? "";
const COSMOSDB_KEY = process.env.SHOP_COSMOSDB_KEY;
const COSMOSDB_DATABASE_NAME = process.env.SHOP_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";
const CONTAINER_ID = process.env.COSMOSDB_CONTAINER_ID || "Places"; // Namen anpassen

let client: CosmosClient;
if (COSMOSDB_KEY) {
  client = new CosmosClient({ endpoint: COSMOSDB_ENDPOINT, key: COSMOSDB_KEY });
} else {
  client = new CosmosClient({ endpoint: COSMOSDB_ENDPOINT, aadCredentials: new DefaultAzureCredential() });
}

export async function getAllShops(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log("Abrufen aller Shops aus der Datenbank...");

  try {
    // 1. Referenz auf den Container holen
    const database = client.database(COSMOSDB_DATABASE_NAME);
    const container = database.container(CONTAINER_ID);

    // 2. Query definieren
    const querySpec: SqlQuerySpec = {
      query: "SELECT * FROM c",
    };

    // 3. Abfrage ausführen und Ergebnisse holen
    // fetchAll() holt alle Ergebnisse. Bei sehr großen Datenmengen sollte man Pagination nutzen.
    const { resources: items } = await container.items.query(querySpec).fetchAll();

    // 4. Erfolgreiche Antwort zurückgeben
    return {
      status: 200,
      jsonBody: {
        shops: items,
      },
    };
  } catch (error) {
    // 5. Fehlerbehandlung
    context.error("Fehler beim Abrufen der Shops:", error);

    return {
      status: 500,
      body: "Ein interner Serverfehler ist aufgetreten.",
    };
  }
}

app.http("getShops", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "shops",
  handler: getAllShops,
});
