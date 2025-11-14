import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function getShops(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log("HTTP request received for getShops");

    return {
        status: 200,
        jsonBody: {
            shops: [
                { id: 1, name: "Shop A" },
                { id: 2, name: "Shop B" }
            ]
        }
    };
}

app.http("getShops", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "shops",
    handler: getShops
});
