/**
 * Grid Generator Azure Function
 *
 * Timer-triggered function that generates a grid of search points covering Stuttgart
 * and queues each point for processing by the placeSearch function.
 */

import { app, InvocationContext, output, Timer } from "@azure/functions";
import { generateUniformTiledGrid } from "../services/gridService";
import { SERVICE_BUS_CONFIG } from "../config/infraConfig";
import { validateEnvironmentVariables } from "../utils/envValidation";
import type { GridPointMessage } from "../types/grid.types";
import { BASE_CELL_SIZE_KM } from "../config/adaptiveGridConfig";

// Service Bus output binding for grid points
const serviceBusOutput = output.serviceBusQueue({
  queueName: SERVICE_BUS_CONFIG.gridPointsQueueName,
  connection: SERVICE_BUS_CONFIG.connectionStringEnvVar,
});

app.timer("gridGenerator", {
  // Run weekly on Sunday at 3:00 AM, or use custom CRON from env
  schedule: process.env.PLACE_SEARCH_CRON ?? "0 */3 * * * *",
  handler: gridGeneratorHandler,
  extraOutputs: [serviceBusOutput],
});

export function gridGeneratorHandler(timer: Timer, context: InvocationContext): void {
  try {
    // Validate environment variables before execution
    validateEnvironmentVariables();

    context.log("Grid Generator started at", new Date().toISOString());
    context.log(`Using uniform grid with perfect rectangle tiling (${BASE_CELL_SIZE_KM}km cells)`);

    if (timer.isPastDue) {
      context.log("Timer is past due, running anyway");
    }

    // Generate uniform tiled grid for Stuttgart
    const grid = generateUniformTiledGrid();

    context.log(`Generated ${String(grid.totalPoints)} grid points for Stuttgart`);
    context.log(`Bounding box: [${grid.boundingBox.map(String).join(", ")}]`);
    context.log(`Cell size: ${BASE_CELL_SIZE_KM}km (perfect edge-to-edge tiling, 100% coverage)`);

    // Queue each grid point for processing
    const messages: GridPointMessage[] = grid.points;

    // Set the output binding with all messages
    context.extraOutputs.set(serviceBusOutput, messages);

    context.log(`\nQueued ${String(messages.length)} grid points to Service Bus for processing`);
  } catch (error) {
    context.error("Error in Grid Generator:", error);
    throw error;
  }
}
