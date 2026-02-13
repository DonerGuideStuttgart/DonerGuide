/* eslint-disable @typescript-eslint/no-explicit-any */
import { GridService } from "../grid.service";
import { Container } from "@azure/cosmos";
import type { GridCell } from "../../types/grid";
import { cellIntersectsBoundary } from "../../utils/geometry.util";

jest.mock("../../utils/geometry.util", () => ({
  getStuttgartBBox: () => ({ minLat: 48.0, minLon: 9.0, maxLat: 49.0, maxLon: 10.0 }),
  cellIntersectsBoundary: jest.fn().mockReturnValue(true),
}));

const mockedCellIntersectsBoundary = cellIntersectsBoundary as jest.MockedFunction<typeof cellIntersectsBoundary>;

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
    it("should create 16 cells if grid is empty", async () => {
      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [0] }),
      });

      await gridService.initializeGrid("v1");

      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(16);
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
        // Return false for every other cell (8 out of 16 skipped)
        return callCount % 2 === 0;
      });

      await gridService.initializeGrid("v1");

      expect(mockedCellIntersectsBoundary).toHaveBeenCalledTimes(16);
      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(8);
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
          maxLat: 48.2, // Lat diff 0.2
          maxLon: 9.1, // Lon diff 0.1
        },
        geometry: { type: "Polygon", coordinates: [] },
        resultsCount: 60,
        foundPlaceIds: [],
        lastProcessedAt: new Date().toISOString(),
      };

      mockContainer.items.create = jest.fn().mockResolvedValue({});
      mockContainer.items.upsert = jest.fn().mockResolvedValue({});
    });

    it("should split along latitude if it's the longer side", async () => {
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
    it("should split along longitude if it's the longer side", async () => {
      mockCell.boundaryBox.maxLat = 48.1; // Lat diff 0.1
      mockCell.boundaryBox.maxLon = 9.3; // Lon diff 0.3

      await gridService.splitCell(mockCell as GridCell);

      const child1 = (mockContainer.items.create as jest.Mock).mock.calls[0][0];
      const child2 = (mockContainer.items.create as jest.Mock).mock.calls[1][0];

      // midLon = 9.15
      expect(child1.boundaryBox.maxLon).toBe(9.15);
      expect(child2.boundaryBox.minLon).toBe(9.15);
    });

    it("should mark as COMPLETED if MAX_LEVEL is reached", async () => {
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
