import { CosmosClient, SqlQuerySpec } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
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

export async function getAllShops(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log("Filtere Shops (Hybrid: SQL für Zahlen, JS für Text)...");

  try {
    const database = client.database(COSMOSDB_DATABASE_NAME);
    const container = database.container(CONTAINER_ID);

    // --- 1. Parameter parsen ---
    const limit = parseInt(request.query.get("limit") || "20");
    const offset = parseInt(request.query.get("offset") || "0");

    const sort = request.query.get("sort");
    const district = request.query.get("district"); // String, z.B. "Mitte,West"
    const rating = request.query.get("rating");
    const priceMin = request.query.get("price_min");
    const priceMax = request.query.get("price_max");
    const vegetarian = request.query.get("vegetarian")?.toLowerCase();

    // --- 2. SQL Query (Nur "harte" Filter für den Emulator) ---
    // Wir entfernen District, Sortierung & Pagination aus SQL.
    let queryText = "SELECT * FROM c WHERE 1=1";
    const parameters = [];

    // Rating Filter (Zahlen sind sicher für Emulator)
    if (rating) {
      const minScore = parseFloat(rating) * 20;
      queryText += " AND (c.ai_score >= @minScore)";
      parameters.push({ name: "@minScore", value: minScore });
    }

    // Preis Filter
    if (priceMin) {
      queryText += " AND c.price >= @priceMin";
      parameters.push({ name: "@priceMin", value: parseFloat(priceMin) });
    }
    if (priceMax) {
      queryText += " AND c.price <= @priceMax";
      parameters.push({ name: "@priceMax", value: parseFloat(priceMax) });
    }

    // Vegetarisch Filter (Boolean ist sicher)
    if (vegetarian) {
      const isVeggie = ["true", "1", "yes"].includes(vegetarian);
      queryText += " AND c.servesVegetarianFood = @isVeggie";
      parameters.push({ name: "@isVeggie", value: isVeggie });
    }

    // HINWEIS: Kein OFFSET/LIMIT hier, da wir erst später in JS filtern!

    const querySpec: SqlQuerySpec = {
      query: queryText,
      parameters: parameters,
    };

    // --- 3. Daten abrufen ---
    const { resources: rawItems } = await container.items.query(querySpec).fetchAll();

    // --- 4. Mapping (Exakt für Frontend Mock Struktur) ---
    let processedItems = rawItems.map(mapToStore);

    // --- 5. JS Filterung (Ersetzt SQL CONTAINS für District) ---
    if (district) {
      const searchTerms = district.split(",").map((d) => d.trim().toLowerCase());

      processedItems = processedItems.filter((item) => {
        // Wir suchen im 'district' Feld des gemappten Objekts
        if (!item.district) return false;
        const itemDistLower = item.district.toLowerCase();

        return searchTerms.some((term) => itemDistLower.includes(term));
      });
    }

    // --- 6. JS Sortierung ---
    if (sort) {
      processedItems.sort((a, b) => {
        // Zugriff auf die CamelCase Properties des Mappers
        switch (sort) {
          case "rating_desc":
            return (b.aiScore || 0) - (a.aiScore || 0);
          case "rating_asc":
            return (a.aiScore || 0) - (b.aiScore || 0);
          case "price_asc":
            return (a.price || 0) - (b.price || 0);
          case "price_desc":
            return (b.price || 0) - (a.price || 0);
          default:
            return 0;
        }
      });
    }

    // --- 7. JS Pagination ---
    // Erst schneiden, nachdem gefiltert und sortiert wurde
    const totalItems = processedItems.length;
    const pagedItems = processedItems.slice(offset, offset + limit);
    const page = Math.floor(offset / limit) + 1;

    return {
      status: 200,
      jsonBody: {
        items: pagedItems, // Das sind jetzt saubere "Store" Objekte
        meta: {
          page: page,
          pageSize: limit,
          totalItems: totalItems,
          totalPages: Math.ceil(totalItems / limit),
        },
      },
    };
  } catch (error) {
    context.error("Fehler beim Abrufen der Shops:", error);
    return { status: 500, body: "Interner Serverfehler" };
  }
}

app.http("getShops", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "places",
  handler: getAllShops,
});
