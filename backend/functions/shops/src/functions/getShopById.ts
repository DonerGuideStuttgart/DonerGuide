import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export function getShopById(request: HttpRequest, context: InvocationContext): HttpResponseInit {
    const id = request.params.id;
    context.log(`Get shop by ID: ${id}`);

    return {
        status: 200,
        jsonBody: { id, name: "Shop " + id }
    };
}

app.http("getShopById", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "shops/{id}",
    handler: getShopById
});
