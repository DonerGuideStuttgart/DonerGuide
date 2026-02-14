/* eslint-disable @typescript-eslint/no-explicit-any */
import { GridService } from "../grid.service";
import { Container } from "@azure/cosmos";
import type { GridCell } from "../../types/grid";
import { cellIntersectsBoundary } from "../../utils/geometry.util";

jest.mock("../../config/gridConfig", () => ({
  GRID_CONFIG: {
    baseCellSizeKm: 5,
    subdivision: {
      threshold: 60,
      maxDepth: 10,
      minCellSizeM: 50,
    },
    merge: {
      maxMergedResults: 40,
      maxMergedCellSizeKm: 15,
    },
  },
}));

// Provide real implementations for the new geodetic functions, mock only boundary-related ones
jest.mock("../../utils/geometry.util", () => {
  const actual = jest.requireActual("../../utils/geometry.util");
  return {
    ...actual,
    getStuttgartBBox: () => ({ minLat: 48.0, minLon: 9.0, maxLat: 49.0, maxLon: 10.0 }),
    cellIntersectsBoundary: jest.fn().mockReturnValue(true),
  };
});

const mockedCellIntersectsBoundary = cellIntersectsBoundary as jest.MockedFunction<typeof cellIntersectsBoundary>;

/** Helper: compute expected grid dimensions for the mock BBox with TARGET_CELL_SIZE_KM = 5 */
function getExpectedGridDimensions() {
  const minLat = 48.0,
    maxLat = 49.0,
    minLon = 9.0,
    maxLon = 10.0;
  const latStep = 5 / 111.32;
  const rows = Math.ceil((maxLat - minLat) / latStep);

  let totalCells = 0;
  for (let i = 0; i < rows; i++) {
    const cellMinLat = minLat + i * latStep;
    const cellMaxLat = Math.min(minLat + (i + 1) * latStep, maxLat);
    const centerLat = (cellMinLat + cellMaxLat) / 2;
    const lonStep = 5 / (111.32 * Math.cos((centerLat * Math.PI) / 180));
    const cols = Math.ceil((maxLon - minLon) / lonStep);
    totalCells += cols;
  }

  return { rows, totalCells };
}

describe("GridService", () => {
  let mockContainer: jest.Mocked<Container>;
  let gridService: GridService;

  beforeEach(() => {
    mockContainer = {
      items: {
        query: jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
        }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    } as any;
    gridService = new GridService(mockContainer);
    mockedCellIntersectsBoundary.mockReset();
    mockedCellIntersectsBoundary.mockReturnValue(true);
  });

  describe("initializeGrid", () => {
    it("should create km-based grid cells when grid is empty", async () => {
      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [0] }),
      });

      await gridService.initializeGrid("v1");

      const { totalCells } = getExpectedGridDimensions();
      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(totalCells);

      const firstCell = (mockContainer.items.upsert as jest.Mock).mock.calls[0][0];
      expect(firstCell.gridVersion).toBe("v1");
      expect(firstCell.level).toBe(0);
      expect(firstCell.status).toBe("PENDING");
      expect(firstCell.boundaryBox.minLat).toBe(48.0);
      expect(firstCell.boundaryBox.minLon).toBe(9.0);
    });

    it("should not create cells if grid version already exists", async () => {
      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [16] }),
      });

      await gridService.initializeGrid("v1");

      expect(mockContainer.items.upsert).not.toHaveBeenCalled();
    });

    it("should skip cells outside Stuttgart boundary", async () => {
      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [0] }),
      });

      let callCount = 0;
      mockedCellIntersectsBoundary.mockImplementation(() => {
        callCount++;
        return callCount % 2 === 0;
      });

      await gridService.initializeGrid("v1");

      const { totalCells } = getExpectedGridDimensions();
      expect(mockedCellIntersectsBoundary).toHaveBeenCalledTimes(totalCells);
      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(Math.floor(totalCells / 2));
    });

    it("should produce cells with approximately equal real-world side lengths", async () => {
      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [0] }),
      });

      await gridService.initializeGrid("v1");

      // Check a cell from the middle of the grid
      const calls = (mockContainer.items.upsert as jest.Mock).mock.calls;
      const midCell = calls[Math.floor(calls.length / 2)][0] as GridCell;
      const { minLat, maxLat, minLon, maxLon } = midCell.boundaryBox;

      const centerLat = (minLat + maxLat) / 2;
      const latSideKm = (maxLat - minLat) * 111.32;
      const lonSideKm = (maxLon - minLon) * 111.32 * Math.cos((centerLat * Math.PI) / 180);

      // Both sides should be approximately TARGET_CELL_SIZE_KM (5 km), within tolerance
      expect(latSideKm).toBeCloseTo(5, 0);
      expect(lonSideKm).toBeCloseTo(5, 0);
    });
  });

  describe("getNextCell", () => {
    it("should return the first cell from query results", async () => {
      const mockCell = { id: "cell-1", lastProcessedAt: "2021-01-01T00:00:00Z" };
      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [mockCell] }),
      });

      const cell = await gridService.getNextCell("v1");

      expect(cell).toEqual(mockCell);
    });

    it("should return null if no cells found", async () => {
      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      });

      const cell = await gridService.getNextCell("v1");

      expect(cell).toBeNull();
    });
  });

  describe("splitCell", () => {
    let mockCell: any;

    beforeEach(() => {
      mockCell = {
        id: "parent-id",
        gridVersion: "v1",
        level: 0,
        status: "PROCESSING",
        boundaryBox: {
          minLat: 48.0,
          minLon: 9.0,
          maxLat: 48.2, // Lat diff 0.2 → ~22.3 km
          maxLon: 9.1, // Lon diff 0.1 → ~7.4 km
        },
        geometry: { type: "Polygon", coordinates: [] },
        resultsCount: 60,
        foundPlaceIds: [],
        lastProcessedAt: new Date().toISOString(),
      };

      mockContainer.items.create = jest.fn().mockResolvedValue({});
      mockContainer.items.upsert = jest.fn().mockResolvedValue({});
    });

    it("should split along latitude when lat side is longer in km", async () => {
      // latSideKm ≈ 22.3 km, lonSideKm ≈ 7.4 km → split lat
      await gridService.splitCell(mockCell as GridCell);

      expect(mockContainer.items.create).toHaveBeenCalledTimes(2);
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "parent-id",
          status: "SPLIT",
        })
      );

      const child1 = (mockContainer.items.create as jest.Mock).mock.calls[0][0];
      const child2 = (mockContainer.items.create as jest.Mock).mock.calls[1][0];

      expect(child1.level).toBe(1);
      expect(child2.level).toBe(1);

      // midLat = 48.1
      expect(child1.boundaryBox.maxLat).toBe(48.1);
      expect(child2.boundaryBox.minLat).toBe(48.1);
    });

    it("should split along longitude when lon side is longer in km", async () => {
      mockCell.boundaryBox.maxLat = 48.1; // Lat diff 0.1 → ~11.1 km
      mockCell.boundaryBox.maxLon = 9.3; // Lon diff 0.3 → ~22.2 km

      await gridService.splitCell(mockCell as GridCell);

      const child1 = (mockContainer.items.create as jest.Mock).mock.calls[0][0];
      const child2 = (mockContainer.items.create as jest.Mock).mock.calls[1][0];

      // midLon = 9.15
      expect(child1.boundaryBox.maxLon).toBe(9.15);
      expect(child2.boundaryBox.minLon).toBe(9.15);
    });

    it("should use geodetic km comparison, not degree comparison for split axis", async () => {
      // A cell where lonDiff > latDiff in degrees, but latSideKm > lonSideKm in reality
      // latDiff = 0.05° → ~5.57 km, lonDiff = 0.06° → ~4.44 km (at ~48° latitude)
      mockCell.boundaryBox = {
        minLat: 48.0,
        minLon: 9.0,
        maxLat: 48.05,
        maxLon: 9.06,
      };

      await gridService.splitCell(mockCell as GridCell);

      const child1 = (mockContainer.items.create as jest.Mock).mock.calls[0][0];
      const child2 = (mockContainer.items.create as jest.Mock).mock.calls[1][0];

      // Should split along latitude (the longer real-world side), not longitude
      expect(child1.boundaryBox.maxLat).toBe(48.025);
      expect(child2.boundaryBox.minLat).toBe(48.025);
      // Longitude should remain unchanged
      expect(child1.boundaryBox.maxLon).toBe(9.06);
      expect(child2.boundaryBox.maxLon).toBe(9.06);
    });

    it("should mark as COMPLETED if maxDepth is reached", async () => {
      mockCell.level = 10;

      await gridService.splitCell(mockCell as GridCell);

      expect(mockContainer.items.create).not.toHaveBeenCalled();
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "parent-id",
          status: "COMPLETED",
        })
      );
    });

    it("should mark as COMPLETED if child cell would be below minCellSizeM", async () => {
      // Create a tiny cell where the shorter side is ~55m (0.0005° lat ≈ 55.7m)
      // Halving gives ~27.8m which is below minCellSizeM of 50m
      mockCell.boundaryBox = {
        minLat: 48.0,
        minLon: 9.0,
        maxLat: 48.0005, // ~55.7m
        maxLon: 9.001, // ~74.2m
      };

      await gridService.splitCell(mockCell as GridCell);

      expect(mockContainer.items.create).not.toHaveBeenCalled();
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "parent-id",
          status: "COMPLETED",
        })
      );
    });

    it("should only create children that intersect boundary", async () => {
      let callCount = 0;
      mockedCellIntersectsBoundary.mockImplementation(() => {
        callCount++;
        return callCount === 1; // Only first candidate passes
      });

      await gridService.splitCell(mockCell as GridCell);

      expect(mockContainer.items.create).toHaveBeenCalledTimes(1);
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: "parent-id", status: "SPLIT" })
      );
    });

    it("should mark parent as SPLIT even when no children intersect", async () => {
      mockedCellIntersectsBoundary.mockReturnValue(false);

      await gridService.splitCell(mockCell as GridCell);

      expect(mockContainer.items.create).not.toHaveBeenCalled();
      expect(mockContainer.items.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: "parent-id", status: "SPLIT" })
      );
    });
  });
});
