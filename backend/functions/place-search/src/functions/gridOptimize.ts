import { CosmosClient, PartitionKeyKind } from "@azure/cosmos";
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { MergeService } from "../services/merge.service";
import { DefaultAzureCredential } from "@azure/identity";

const COSMOSDB_ENDPOINT = process.env.PLACE_SEARCH_COSMOSDB_ENDPOINT ?? "";
const COSMOSDB_KEY = process.env.PLACE_SEARCH_COSMOSDB_KEY;
const COSMOSDB_DATABASE_NAME = process.env.PLACE_SEARCH_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";

let client: CosmosClient;
if (COSMOSDB_KEY) {
  client = new CosmosClient({ endpoint: COSMOSDB_ENDPOINT, key: COSMOSDB_KEY });
} else {
  client = new CosmosClient({ endpoint: COSMOSDB_ENDPOINT, aadCredentials: new DefaultAzureCredential() });
}

app.http("gridOptimize", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: gridOptimize,
});

export async function gridOptimize(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = (await request.json()) as { sourceGridVersion?: string; targetGridVersion?: string };

    if (!body.sourceGridVersion || !body.targetGridVersion) {
      return {
        status: 400,
        jsonBody: { error: "sourceGridVersion and targetGridVersion are required" },
      };
    }

    if (body.sourceGridVersion === body.targetGridVersion) {
      return {
        status: 400,
        jsonBody: { error: "sourceGridVersion and targetGridVersion must be different" },
      };
    }

    const database = (await client.databases.createIfNotExists({ id: COSMOSDB_DATABASE_NAME })).database;
    const gridCellsContainer = (
      await database.containers.createIfNotExists({
        id: "GridCells",
        partitionKey: {
          paths: ["/id"],
          kind: PartitionKeyKind.Hash,
        },
      })
    ).container;

    const mergeService = new MergeService(gridCellsContainer);
    const result = await mergeService.optimizeGrid(body.sourceGridVersion, body.targetGridVersion);

    if (!result) {
      return {
        status: 409,
        jsonBody: { error: "Grid is not complete or has no leaf cells. Cannot optimize." },
      };
    }

    context.log(
      `Grid optimized: ${String(result.originalLeafCellCount)} → ${String(result.mergedCellCount)} cells (saved ${String(result.cellsSaved)})`
    );

    return {
      status: 200,
      jsonBody: result,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    context.error(`Error in gridOptimize: ${errorMessage}`);
    return {
      status: 500,
      jsonBody: { error: errorMessage },
    };
  }
}
