/* eslint-disable */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

app.http("ping_pong", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "ping",
  handler: ping_pong,
});

export function ping_pong(request: HttpRequest, context: InvocationContext): HttpResponseInit {
  return {
    body: "pong",
  } as HttpResponseInit;
}
