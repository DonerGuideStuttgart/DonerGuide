import { Container } from "@azure/cosmos";
import { v4 as uuidv4 } from "uuid";
import { GridCell } from "../types/grid";

export class GridService {
  constructor(private container: Container) {}

  /**
   * Initializes the grid if the version has changed or no cells exist.
   * Creates a 4x4 level 0 grid for Stuttgart.
   */
  async initializeGrid(gridVersion: string): Promise<void> {
    const { resources: existing } = await this.container.items
      .query({
        query: "SELECT VALUE count(1) FROM c WHERE c.gridVersion = @version",
        parameters: [{ name: "@version", value: gridVersion }],
      })
      .fetchAll();

    if (existing[0] > 0) {
      return;
    }

    const minLat = parseFloat(process.env.PLACE_SEARCH_STUTTGART_MIN_LAT || "48.692");
    const minLon = parseFloat(process.env.PLACE_SEARCH_STUTTGART_MIN_LON || "9.038");
    const maxLat = parseFloat(process.env.PLACE_SEARCH_STUTTGART_MAX_LAT || "48.866");
    const maxLon = parseFloat(process.env.PLACE_SEARCH_STUTTGART_MAX_LON || "9.315");

    const latStep = (maxLat - minLat) / 4;
    const lonStep = (maxLon - minLon) / 4;

    const cells: GridCell[] = [];

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const cellMinLat = minLat + i * latStep;
        const cellMaxLat = minLat + (i + 1) * latStep;
        const cellMinLon = minLon + j * lonStep;
        const cellMaxLon = minLon + (j + 1) * lonStep;

        const cell: GridCell = {
          id: uuidv4(),
          gridVersion,
          level: 0,
          status: "PENDING",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [cellMinLon, cellMinLat],
                [cellMaxLon, cellMinLat],
                [cellMaxLon, cellMaxLat],
                [cellMinLon, cellMaxLat],
                [cellMinLon, cellMinLat],
              ],
            ],
          },
          boundaryBox: {
            minLat: cellMinLat,
            minLon: cellMinLon,
            maxLat: cellMaxLat,
            maxLon: cellMaxLon,
          },
          resultsCount: 0,
          foundPlaceIds: [],
          lastProcessedAt: new Date(0).toISOString(), // Beginning of time
        };
        cells.push(cell);
      }
    }

    // Upsert all cells
    for (const cell of cells) {
      await this.container.items.upsert(cell);
    }
  }

  /**
   * Finds the oldest cell that is not SPLIT.
   * Also considers stale PROCESSING cells (> 30 mins).
   */
  async getNextCell(gridVersion: string): Promise<GridCell | null> {
    const staleThreshold = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const querySpec = {
      query: `
        SELECT * FROM c 
        WHERE c.gridVersion = @version 
        AND c.status != 'SPLIT' 
        AND (c.status != 'PROCESSING' OR c.lastProcessedAt < @staleThreshold)
        ORDER BY c.lastProcessedAt ASC
      `,
      parameters: [
        { name: "@version", value: gridVersion },
        { name: "@staleThreshold", value: staleThreshold },
      ],
    };

    const { resources: cells } = await this.container.items
      .query<GridCell>(querySpec)
      .fetchAll();

    return cells.length > 0 ? cells[0] : null;
  }

  /**
   * Updates cell status and processing time.
   */
  async markAsProcessing(cell: GridCell): Promise<void> {
    cell.status = "PROCESSING";
    cell.lastProcessedAt = new Date().toISOString();
    await this.container.items.upsert(cell);
  }
}
