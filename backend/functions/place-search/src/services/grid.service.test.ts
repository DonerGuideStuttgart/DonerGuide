import { GridService } from "./grid.service";
import { Container } from "@azure/cosmos";

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
    process.env.PLACE_SEARCH_STUTTGART_MIN_LAT = "48.0";
    process.env.PLACE_SEARCH_STUTTGART_MIN_LON = "9.0";
    process.env.PLACE_SEARCH_STUTTGART_MAX_LAT = "49.0";
    process.env.PLACE_SEARCH_STUTTGART_MAX_LON = "10.0";
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
});
