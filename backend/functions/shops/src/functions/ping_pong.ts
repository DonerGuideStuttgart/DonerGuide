/* eslint-disable */

import { app, HttpRequest, HttpResponseInit, InvocationContext, Timer } from "@azure/functions";

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

app.timer("pre_warm", {
  schedule: "0 */15 * * * *",
  handler: pre_warm,
});

export function pre_warm(myTimer: Timer, context: InvocationContext): void {
  null;
}
