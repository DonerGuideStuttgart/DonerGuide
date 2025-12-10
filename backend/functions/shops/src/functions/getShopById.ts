import { app, HttpRequest, HttpResponseInit, InvocationContext, input } from "@azure/functions";
import { Place } from "doner_types"; // Import deines Interfaces

// 1. Definition des Cosmos DB Input Bindings
const cosmosInput = input.cosmosDB({
    databaseName: 'DoenerGuideDB',    // Ersetze mit deinem DB-Namen
    containerName: 'Places',         // Der Name deines Containers
    connection: 'CosmosDBConnection',
    id: '{id}',                      // Holt die ID aus der URL
    partitionKey: '{id}'             // Wir nehmen an: Partition Key ist gleich ID
});

export async function getShopById(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Suche nach Shop mit ID: ${request.params.id}`);

    // 2. Dokument abrufen
    // Das Binding liefert 'unknown', daher casten wir es zu deinem 'Place' Interface
    const placeDoc = context.extraInputs.get(cosmosInput) as Place;

    if (!placeDoc) {
        return {
            status: 404,
            jsonBody: { error: "Shop not found" }
        };
    }

    // Optional: Hier könntest du noch Logik einbauen
    // z.B. prüfen, ob 'placeDoc.delivery' true ist, falls der User nur Lieferdienste will.

    return {
        status: 200,
        jsonBody: placeDoc // Azure serialisiert dein Interface automatisch zu JSON
    };
};

app.http("getShopById", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "shops/{id}",
  handler: getShopById,
});
