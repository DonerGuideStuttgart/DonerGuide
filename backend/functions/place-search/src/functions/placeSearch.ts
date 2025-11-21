/**
 * Use Google Places Text Search (New) to find places
 * later: find additional photos with serpapi.com
 */

import { app, InvocationContext, output, Timer } from "@azure/functions";

app.timer('placeSearch', {
    schedule: process.env["PLACE_SEARCH_CRON"] || "0 */15 * * * *",
    handler: placeSearch,
    return: output.serviceBusQueue({
        queueName: "places",
        connection: "PLACE_SEARCH_SERVICEBUS_CONNECTION_STRING"
    })
});

export async function placeSearch(myTimer: Timer, context: InvocationContext): Promise<string> {
    context.log('Place Search function ran at', new Date().toISOString());
    return JSON.stringify({
        id: "place-id-123",
        displayName: "Sample Place",
        internationalPhoneNumber: "+49 123 4567890",
        latitude: 48.1351,
        longitude: 11.5820,
        openingHours: {
            Mo: null,
            Tu: [600, 1320], // 10:00 - 22:00
            We: [600, 1320], // 10:00 - 22:00
            Th: [600, 1320], // 10:00 - 22:00
            Fr: [600, 1380], // 10:00 - 23:00
            Sa: [720, 1380], // 12:00 - 23:00
            Su: null,
        },
        address: {
            postalCode: "12345",
            locality: "Sample City",
            sublocality: "Sample District",
            streetAddress: "Sample Street 1",
        },
        photos: [
            "https://example.com/photo1.jpg", // URL or blob storage reference
            "https://example.com/photo2.jpg"
        ],
        paymentMethods: [
            "CASH",
            "CREDIT_CARD",
            "DEBIT_CARD",
            "NFC"
        ],
        takeout: true,
        delivery: false,
        dineIn: true,
        servesVegetarianFood: true,
    });
}

