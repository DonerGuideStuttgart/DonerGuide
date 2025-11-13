import { app, InvocationContext, Timer } from "@azure/functions";

export async function placeSearch(myTimer: Timer, context: InvocationContext): Promise<void> {
    context.log('Timer function processed request.');
}

app.timer('placeSearch', {
    schedule: '0 */5 * * * *',
    handler: placeSearch
});
