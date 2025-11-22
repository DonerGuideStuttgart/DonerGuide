/**
 * Use Google Places Text Search (New) to find places
 * later: find additional photos with serpapi.com
 */

import { Container, CosmosClient, PartitionKeyKind } from "@azure/cosmos";
import { app, InvocationContext, output, Timer } from "@azure/functions";
import type { Place } from "doner_types";
import { PaymentMethods } from "doner_types";

const COSMOSDB_DATABASE_CONNECTION_STRING = process.env["PLACE_SEARCH_COSMOSDB_CONNECTION_STRING"] || "";
const COSMOSDB_DATABASE_NAME = process.env["PLACE_SEARCH_COSMOSDB_DATABASE_NAME"] || "DoenerGuideDB";
const COSMOSDB_CONTAINER_NAME = process.env["PLACE_SEARCH_COSMOSDB_CONTAINER_NAME"] || "Places";
const client = new CosmosClient(COSMOSDB_DATABASE_CONNECTION_STRING);


app.timer('placeSearch', {
    schedule: process.env["PLACE_SEARCH_CRON"] || "0 */15 * * * *",
    handler: placeSearch,
    return: output.serviceBusQueue({
        queueName: "places",
        connection: "PLACE_SEARCH_SERVICEBUS_CONNECTION_STRING"
    })
});

export async function placeSearch(myTimer: Timer, context: InvocationContext): Promise<string|undefined> {
    context.log('Place Search function ran at', new Date().toISOString());
    const database = (await client.databases.createIfNotExists({ id: COSMOSDB_DATABASE_NAME })).database;
    const container = (await database.containers.createIfNotExists({ 
        id: COSMOSDB_CONTAINER_NAME,
        partitionKey: { 
            paths: ["/id"],
            kind: PartitionKeyKind.Hash
        }
    })).container;

    
    const place: Place = {
        id: "place_12345",
        doner_guide_version: 1,
        internationalPhoneNumber: "+49 123 4567890",
        latitude: 48.1351,
        longitude: 11.5820,
        openingHours: {
            Tu: [600, 1320], // 10:00 - 22:00
            We: [600, 1320], // 10:00 - 22:00
            Th: [600, 1320], // 10:00 - 22:00
            Fr: [600, 1380], // 10:00 - 23:00
            Sa: [720, 1380], // 12:00 - 23:00
        },
        address: {
            postalCode: "12345",
            locality: "Sample City",
            sublocality: "Sample District",
            streetAddress: "Sample Street 1",
        },
        photos: {
            uncategorized: [
                { id: "photo1", photoUrl: "https://example.com/photo1.jpg" },
                { id: "photo2", photoUrl: "https://example.com/photo2.jpg" },
            ],
        },
        paymentMethods: [
            PaymentMethods.CASH,
            PaymentMethods.CREDIT_CARD,
        ],
        takeout: true,
        delivery: false,
        dineIn: true,
        servesVegetarianFood: true,
    }

    await createOrPatchItem(container, place);

    return JSON.stringify({
        id: place.id,
        photos: place.photos.uncategorized, // only send new uncategorized photos for classification
    });
}

async function createOrPatchItem(container: Container, itemBody: Place) : Promise<void> {

    const querySpec = {
        query: "SELECT VALUE COUNT(1) FROM c WHERE c.id = @id",
        parameters: [
            {
                name: "@id",
                value: itemBody.id
            }
        ]
    };

    const { resources } = await container.items.query(querySpec, {
        partitionKey: itemBody.id // Single-partition query reduces RU cost
    }).fetchAll();

    const exists = resources[0].count === 1;

    if (!exists) {
        await container.items.create(itemBody);
        return;
    }


    const patchBody: any[] = Object.keys(itemBody)
        .filter(key => key !== 'id')
        .map((key: string) => ({
            op: "set",
            path: `/${key}`,
            value: itemBody[key]
        }));
    
    await container.item(itemBody.id, itemBody.id).patch({operations: patchBody});
}