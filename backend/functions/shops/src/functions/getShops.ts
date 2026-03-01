import { CosmosClient, SqlQuerySpec } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { mapToStore, TimeInterval, Weekday } from "./mapper";

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

// CACHE SETUP
const queryCache = new Map<string, { data: any[]; expiresAt: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 Minuten

export async function getAllShops(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const database = client.database(COSMOSDB_DATABASE_NAME);
    const container = database.container(CONTAINER_ID);

    // 1. PARAMETER
    const limitParam = request.query.get("limit");
    const limit = limitParam ? parseInt(limitParam) : 20;
    const offset = parseInt(request.query.get("offset") || "0");
    const sort = request.query.get("sort") || "relevance";

    context.log(`Sortier-Modus: "${sort}"`);

    const district = request.query.get("district");
    const rating = request.query.get("rating");
    const priceMin = request.query.get("price_min");
    const priceMax = request.query.get("price_max");
    const vegetarian = request.query.get("vegetarian")?.toLowerCase();
    const openHoursFilter = request.query.get("open_hours"); // open_this_evening, open_late, open_now
    const sauceMin = request.query.get("sauce_amount_min") ? parseInt(request.query.get("sauce_amount_min")!) : 0;
    const sauceMax = request.query.get("sauce_amount_max") ? parseInt(request.query.get("sauce_amount_max")!) : 100;
    const meatMin = request.query.get("meat_ratio_min") ? parseInt(request.query.get("meat_ratio_min")!) : 0;
    const meatMax = request.query.get("meat_ratio_max") ? parseInt(request.query.get("meat_ratio_max")!) : 100;

    // 2. SQL QUERY
    let queryText = "SELECT * FROM c WHERE 1=1";
    const parameters = [];

    if (rating) {
      const minScore = parseFloat(rating) * 20;
      queryText += " AND (c.ai_score >= @minScore OR c.ai_analysis.score_gesamt * 20 >= @minScore)";
      parameters.push({ name: "@minScore", value: minScore });
    }
    if (priceMin) {
      queryText += " AND c.price >= @priceMin";
      parameters.push({ name: "@priceMin", value: parseFloat(priceMin) });
    }
    if (priceMax) {
      queryText += " AND c.price <= @priceMax";
      parameters.push({ name: "@priceMax", value: parseFloat(priceMax) });
    }
    if (vegetarian) {
      const isVeggie = ["true", "1", "yes"].includes(vegetarian);
      queryText += " AND c.servesVegetarianFood = @isVeggie";
      parameters.push({ name: "@isVeggie", value: isVeggie });
    }

    const querySpec: SqlQuerySpec = { query: queryText, parameters: parameters };

    // 3. DATEN ABRUFEN (MIT CACHE)
    let rawItems: any[] = [];
    const cacheKey = JSON.stringify(querySpec);
    const cachedEntry = queryCache.get(cacheKey);
    const now = Date.now();

    if (cachedEntry && cachedEntry.expiresAt > now) {
      context.log("CACHE HIT: Daten aus dem RAM geladen");
      rawItems = cachedEntry.data;
    } else {
      context.log("CACHE MISS: Daten aus Cosmos DB geladen");
      const { resources } = await container.items.query(querySpec).fetchAll();
      rawItems = resources;

      // Im Cache speichern
      queryCache.set(cacheKey, {
        data: rawItems,
        expiresAt: now + CACHE_TTL_MS,
      });
    }

    // 4. MAPPING
    let processedItems = rawItems.map(mapToStore);

    // 5. FILTERUNG
    processedItems = processedItems.filter((item) => {
      if (district) {
        const searchTerms = district.split(",").map((d) => d.trim().toLowerCase());
        if (!item.district) return false;
        const itemDistLower = item.district.toLowerCase();
        if (!searchTerms.some((term) => itemDistLower.includes(term))) return false;
      }

      if (item.sauceAmount !== undefined && (item.sauceAmount < sauceMin || item.sauceAmount > sauceMax)) return false;
      if (item.meatRatio !== undefined && (item.meatRatio < meatMin || item.meatRatio > meatMax)) return false;

      if (openHoursFilter) {
        const nowTime = new Date();
        const formatter = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Berlin",
          hour: "numeric",
          minute: "numeric",
          weekday: "short",
        });

        const parts = formatter.formatToParts(nowTime);
        const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
        const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0");

        const dayName = parts.find((p) => p.type === "weekday")?.value.toLowerCase() as Weekday;
        const currentMin = hour * 60 + minute;

        const hoursObj = item.openingHours.hours as Record<string, any[] | undefined>;
        const intervals = hoursObj[dayName] || [];

        if (openHoursFilter === "open_now") {
          const isOpen = intervals.some((inv) => currentMin >= inv.start && currentMin <= inv.end);
          if (!isOpen) return false;
        }

        if (openHoursFilter === "open_this_evening") {
          const staysOpenLate = intervals.some((inv) => inv.end >= 1320);
          if (!staysOpenLate) return false;
        }

        if (openHoursFilter === "open_late") {
          const staysOpenVeryLate = intervals.some((inv) => inv.end >= 1560 || inv.end <= 240);
          if (!staysOpenVeryLate) return false;
        }
      }

      return true;
    });

    // 6. SORTIERUNG
    processedItems.sort((a, b) => {
      const scoreA = a.aiScore || 0;
      const scoreB = b.aiScore || 0;
      const priceA = a.price === undefined || a.price === null ? 0 : a.price;
      const priceB = b.price === undefined || b.price === null ? 0 : b.price;
      const hasImagesA = a.imageUrls && a.imageUrls.length > 0;
      const hasImagesB = b.imageUrls && b.imageUrls.length > 0;

      switch (sort) {
        case "relevance": {
          if (hasImagesA !== hasImagesB) {
            return hasImagesB ? 1 : -1;
          }
          return scoreB - scoreA;
        }
        case "ai_score_desc":
        case "score_desc":
          return scoreB - scoreA;

        case "ai_score_asc":
        case "score_asc":
          return scoreA - scoreB;

        case "price_asc": {
          const pA = priceA === 0 ? 9999 : priceA;
          const pB = priceB === 0 ? 9999 : priceB;
          return pA - pB;
        }

        case "price_desc":
          return priceB - priceA;

        default:
          return scoreB - scoreA;
      }
    });

    // 7. PAGINATION
    const totalItems = processedItems.length;
    let pagedItems = processedItems;
    let totalPages = 1;
    let currentPage = 1;

    if (limit > 0) {
      pagedItems = processedItems.slice(offset, offset + limit);
      totalPages = Math.ceil(totalItems / limit);
      currentPage = Math.floor(offset / limit) + 1;
    }

    // HTTP RESPONSE MIT CACHE HEADERS
    return {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60",
      },
      jsonBody: {
        items: pagedItems,
        meta: {
          page: currentPage,
          pageSize: limit > 0 ? limit : totalItems,
          totalItems: totalItems,
          totalPages: totalPages,
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
