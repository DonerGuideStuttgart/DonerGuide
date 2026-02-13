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
  context.log("Filtere Shops...");

  try {
    const database = client.database(COSMOSDB_DATABASE_NAME);
    const container = database.container(CONTAINER_ID);

    // --- 1. Parameter parsen ---
    const limit = parseInt(request.query.get("limit") || "20");
    const offset = parseInt(request.query.get("offset") || "0");

    const sort = request.query.get("sort");
    const district = request.query.get("district");
    const rating = request.query.get("rating");

    // Preis
    const priceMin = request.query.get("price_min");
    const priceMax = request.query.get("price_max");

    // NEU: Sauce & Meat Filter (auslesen)
    // Wir nehmen Standardwerte (0 bis 100), falls nichts übergeben wird
    const sauceMin = request.query.get("sauce_amount_min") ? parseInt(request.query.get("sauce_amount_min")!) : 0;
    const sauceMax = request.query.get("sauce_amount_max") ? parseInt(request.query.get("sauce_amount_max")!) : 100;

    const meatMin = request.query.get("meat_ratio_min") ? parseInt(request.query.get("meat_ratio_min")!) : 0;
    const meatMax = request.query.get("meat_ratio_max") ? parseInt(request.query.get("meat_ratio_max")!) : 100;

    const vegetarian = request.query.get("vegetarian")?.toLowerCase();

    // --- 2. SQL Query ---
    let queryText = "SELECT * FROM c WHERE 1=1";
    const parameters = [];

    // Rating Filter (SQL ist effizient hierfür)
    if (rating) {
      const minScore = parseFloat(rating) * 20;
      queryText += " AND (c.ai_score >= @minScore OR c.ai_analysis.score_gesamt * 20 >= @minScore)"; // Kleiner Trick für nested scores
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

    // Vegetarisch Filter
    if (vegetarian) {
      const isVeggie = ["true", "1", "yes"].includes(vegetarian);
      queryText += " AND c.servesVegetarianFood = @isVeggie";
      parameters.push({ name: "@isVeggie", value: isVeggie });
    }

    const querySpec: SqlQuerySpec = {
      query: queryText,
      parameters: parameters,
    };

    // --- 3. Daten abrufen ---
    const { resources: rawItems } = await container.items.query(querySpec).fetchAll();

    // --- 4. Mapping ---
    let processedItems = rawItems.map(mapToStore);

    // --- 5. JS Filterung (Text, Sauce, Meat) ---
    // Hier filtern wir die normalisierten Daten aus dem Mapper

    processedItems = processedItems.filter((item) => {
      // A) District Filter
      if (district) {
        const searchTerms = district.split(",").map((d) => d.trim().toLowerCase());
        if (!item.district) return false;
        const itemDistLower = item.district.toLowerCase();
        if (!searchTerms.some((term) => itemDistLower.includes(term))) return false;
      }

      // B) NEU: Sauce Amount Filter
      // Wir prüfen nur, wenn Werte im Item vorhanden sind.
      // Wenn das Item gar keinen sauceAmount hat (undefined), entscheiden wir: Rausfliegen?
      // Hier: Wenn undefined, wird es ignoriert (bleibt drin, es sei denn man will strikt filtern)
      // Üblicher: Wenn man explizit filtert, will man nur Items, die Daten haben.
      if (item.sauceAmount !== undefined) {
        if (item.sauceAmount < sauceMin || item.sauceAmount > sauceMax) return false;
      }

      // C) NEU: Meat Ratio Filter
      if (item.meatRatio !== undefined) {
        if (item.meatRatio < meatMin || item.meatRatio > meatMax) return false;
      }

      return true;
    });

    // --- 6. Sortierung ---
    if (sort) {
      processedItems.sort((a, b) => {
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

    // --- 7. Pagination ---
    const totalItems = processedItems.length;
    const pagedItems = processedItems.slice(offset, offset + limit);
    const page = Math.floor(offset / limit) + 1;

    return {
      status: 200,
      jsonBody: {
        items: pagedItems,
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
