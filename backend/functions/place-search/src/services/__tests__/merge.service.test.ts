/* eslint-disable @typescript-eslint/no-explicit-any */
import { MergeService } from "../merge.service";
import { Container } from "@azure/cosmos";
import type { GridCell } from "../../types/grid";

jest.mock("../../config/gridConfig", () => ({
  GRID_CONFIG: {
    baseCellSizeKm: 5,
    subdivision: {
      threshold: 55,
      maxDepth: 10,
      minCellSizeM: 50,
    },
    merge: {
      maxMergedResults: 40,
      maxMergedCellSizeKm: 15,
    },
  },
}));

// Use real geometry implementations
jest.mock("../../utils/geometry.util", () => {
  const actual = jest.requireActual("../../utils/geometry.util");
  return { ...actual };
});

function createCell(overrides: Partial<GridCell> & { id: string; boundaryBox: GridCell["boundaryBox"] }): GridCell {
  const bbox = overrides.boundaryBox;
  return {
    gridVersion: "v1",
    level: 0,
    status: "COMPLETED",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [bbox.minLon, bbox.minLat],
          [bbox.maxLon, bbox.minLat],
          [bbox.maxLon, bbox.maxLat],
          [bbox.minLon, bbox.maxLat],
          [bbox.minLon, bbox.minLat],
        ],
      ],
    },
    resultsCount: 0,
    foundPlaceIds: [],
    lastProcessedAt: "2000-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("MergeService", () => {
  let mockContainer: jest.Mocked<Container>;
  let mergeService: MergeService;

  beforeEach(() => {
    mockContainer = {
      items: {
        query: jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
        }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    } as any;
    mergeService = new MergeService(mockContainer);
  });

  describe("isGridComplete", () => {
    it("should return true when no incomplete cells exist", async () => {
      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [0] }),
      });

      const result = await mergeService.isGridComplete("v1");
      expect(result).toBe(true);
    });

    it("should return false when PENDING cells exist", async () => {
      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [3] }),
      });

      const result = await mergeService.isGridComplete("v1");
      expect(result).toBe(false);
    });
  });

  describe("findMergeCandidates", () => {
    it("should find adjacent cells sharing a full lat edge", () => {
      const cellA = createCell({
        id: "a",
        boundaryBox: { minLat: 48.0, minLon: 9.0, maxLat: 48.05, maxLon: 9.05 },
        resultsCount: 10,
      });
      const cellB = createCell({
        id: "b",
        boundaryBox: { minLat: 48.05, minLon: 9.0, maxLat: 48.1, maxLon: 9.05 },
        resultsCount: 15,
      });

      const candidates = mergeService.findMergeCandidates([cellA, cellB]);
      expect(candidates).toHaveLength(1);
      expect(candidates[0].combinedResultsCount).toBe(25);
      expect(candidates[0].sharedAxis).toBe("lat");
    });

    it("should find adjacent cells sharing a full lon edge", () => {
      const cellA = createCell({
        id: "a",
        boundaryBox: { minLat: 48.0, minLon: 9.0, maxLat: 48.05, maxLon: 9.05 },
        resultsCount: 5,
      });
      const cellB = createCell({
        id: "b",
        boundaryBox: { minLat: 48.0, minLon: 9.05, maxLat: 48.05, maxLon: 9.1 },
        resultsCount: 8,
      });

      const candidates = mergeService.findMergeCandidates([cellA, cellB]);
      expect(candidates).toHaveLength(1);
      expect(candidates[0].sharedAxis).toBe("lon");
    });

    it("should reject cells exceeding maxMergedResults", () => {
      const cellA = createCell({
        id: "a",
        boundaryBox: { minLat: 48.0, minLon: 9.0, maxLat: 48.05, maxLon: 9.05 },
        resultsCount: 25,
      });
      const cellB = createCell({
        id: "b",
        boundaryBox: { minLat: 48.05, minLon: 9.0, maxLat: 48.1, maxLon: 9.05 },
        resultsCount: 20,
      });

      // 25 + 20 = 45 > maxMergedResults (40)
      const candidates = mergeService.findMergeCandidates([cellA, cellB]);
      expect(candidates).toHaveLength(0);
    });

    it("should reject partial edges (different levels)", () => {
      // Full-width level-0 cell
      const cellA = createCell({
        id: "a",
        boundaryBox: { minLat: 48.0, minLon: 9.0, maxLat: 48.05, maxLon: 9.1 },
        resultsCount: 5,
      });
      // Half-width level-1 cell adjacent but only shares partial edge
      const cellB = createCell({
        id: "b",
        level: 1,
        boundaryBox: { minLat: 48.05, minLon: 9.0, maxLat: 48.1, maxLon: 9.05 },
        resultsCount: 3,
      });

      const candidates = mergeService.findMergeCandidates([cellA, cellB]);
      expect(candidates).toHaveLength(0);
    });

    it("should reject non-adjacent cells", () => {
      const cellA = createCell({
        id: "a",
        boundaryBox: { minLat: 48.0, minLon: 9.0, maxLat: 48.05, maxLon: 9.05 },
        resultsCount: 5,
      });
      const cellB = createCell({
        id: "b",
        boundaryBox: { minLat: 48.2, minLon: 9.2, maxLat: 48.25, maxLon: 9.25 },
        resultsCount: 3,
      });

      const candidates = mergeService.findMergeCandidates([cellA, cellB]);
      expect(candidates).toHaveLength(0);
    });

    it("should reject cells exceeding maxMergedCellSizeKm", () => {
      // Two tall cells that when merged would exceed 15km
      const cellA = createCell({
        id: "a",
        boundaryBox: { minLat: 48.0, minLon: 9.0, maxLat: 48.07, maxLon: 9.05 },
        resultsCount: 5,
      });
      const cellB = createCell({
        id: "b",
        boundaryBox: { minLat: 48.07, minLon: 9.0, maxLat: 48.14, maxLon: 9.05 },
        resultsCount: 3,
      });

      // Merged latSideKm ≈ 0.14 * 111.32 ≈ 15.6 km > 15
      const candidates = mergeService.findMergeCandidates([cellA, cellB]);
      expect(candidates).toHaveLength(0);
    });

    it("should sort candidates by combined results count ascending", () => {
      const cellA = createCell({
        id: "a",
        boundaryBox: { minLat: 48.0, minLon: 9.0, maxLat: 48.05, maxLon: 9.05 },
        resultsCount: 15,
      });
      const cellB = createCell({
        id: "b",
        boundaryBox: { minLat: 48.05, minLon: 9.0, maxLat: 48.1, maxLon: 9.05 },
        resultsCount: 10,
      });
      const cellC = createCell({
        id: "c",
        boundaryBox: { minLat: 48.1, minLon: 9.0, maxLat: 48.15, maxLon: 9.05 },
        resultsCount: 2,
      });

      const candidates = mergeService.findMergeCandidates([cellA, cellB, cellC]);
      // B+C = 12, A+B = 25
      expect(candidates.length).toBeGreaterThanOrEqual(2);
      expect(candidates[0].combinedResultsCount).toBeLessThanOrEqual(candidates[1].combinedResultsCount);
    });
  });

  describe("performMerges", () => {
    it("should merge a simple pair", () => {
      const cellA = createCell({
        id: "a",
        boundaryBox: { minLat: 48.0, minLon: 9.0, maxLat: 48.05, maxLon: 9.05 },
        resultsCount: 10,
      });
      const cellB = createCell({
        id: "b",
        boundaryBox: { minLat: 48.05, minLon: 9.0, maxLat: 48.1, maxLon: 9.05 },
        resultsCount: 15,
      });

      const result = mergeService.performMerges([cellA, cellB]);
      expect(result).toHaveLength(1);
      expect(result[0].resultsCount).toBe(25);
      expect(result[0].boundaryBox).toEqual({
        minLat: 48.0,
        minLon: 9.0,
        maxLat: 48.1,
        maxLon: 9.05,
      });
    });

    it("should perform iterative merges (A+B → AB, then AB+C → ABC)", () => {
      const cellA = createCell({
        id: "a",
        boundaryBox: { minLat: 48.0, minLon: 9.0, maxLat: 48.03, maxLon: 9.05 },
        resultsCount: 5,
      });
      const cellB = createCell({
        id: "b",
        boundaryBox: { minLat: 48.03, minLon: 9.0, maxLat: 48.06, maxLon: 9.05 },
        resultsCount: 5,
      });
      const cellC = createCell({
        id: "c",
        boundaryBox: { minLat: 48.06, minLon: 9.0, maxLat: 48.09, maxLon: 9.05 },
        resultsCount: 5,
      });

      const result = mergeService.performMerges([cellA, cellB, cellC]);
      expect(result).toHaveLength(1);
      expect(result[0].resultsCount).toBe(15);
      expect(result[0].boundaryBox.minLat).toBe(48.0);
      expect(result[0].boundaryBox.maxLat).toBe(48.09);
    });

    it("should return cells unchanged when no merges are possible", () => {
      const cellA = createCell({
        id: "a",
        boundaryBox: { minLat: 48.0, minLon: 9.0, maxLat: 48.05, maxLon: 9.05 },
        resultsCount: 30,
      });
      const cellB = createCell({
        id: "b",
        boundaryBox: { minLat: 48.05, minLon: 9.0, maxLat: 48.1, maxLon: 9.05 },
        resultsCount: 30,
      });

      // 30 + 30 = 60 > maxMergedResults (40)
      const result = mergeService.performMerges([cellA, cellB]);
      expect(result).toHaveLength(2);
    });

    it("should handle mixed scenario with some mergeable and some not", () => {
      // Cells A and B can merge (low results), C cannot merge with either
      const cellA = createCell({
        id: "a",
        boundaryBox: { minLat: 48.0, minLon: 9.0, maxLat: 48.05, maxLon: 9.05 },
        resultsCount: 5,
      });
      const cellB = createCell({
        id: "b",
        boundaryBox: { minLat: 48.05, minLon: 9.0, maxLat: 48.1, maxLon: 9.05 },
        resultsCount: 5,
      });
      // C is far away, not adjacent
      const cellC = createCell({
        id: "c",
        boundaryBox: { minLat: 48.5, minLon: 9.5, maxLat: 48.55, maxLon: 9.55 },
        resultsCount: 35,
      });

      const result = mergeService.performMerges([cellA, cellB, cellC]);
      expect(result).toHaveLength(2); // AB merged + C unchanged
    });

    it("should use minimum level of merged cells", () => {
      const cellA = createCell({
        id: "a",
        level: 2,
        boundaryBox: { minLat: 48.0, minLon: 9.0, maxLat: 48.05, maxLon: 9.05 },
        resultsCount: 5,
      });
      const cellB = createCell({
        id: "b",
        level: 1,
        boundaryBox: { minLat: 48.05, minLon: 9.0, maxLat: 48.1, maxLon: 9.05 },
        resultsCount: 5,
      });

      const result = mergeService.performMerges([cellA, cellB]);
      expect(result).toHaveLength(1);
      expect(result[0].level).toBe(1);
    });
  });

  describe("optimizeGrid", () => {
    it("should return null for incomplete grid", async () => {
      // isGridComplete returns false (3 incomplete cells)
      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [3] }),
      });

      const result = await mergeService.optimizeGrid("v1", "v2");
      expect(result).toBeNull();
    });

    it("should return null for empty grid", async () => {
      // First call: isGridComplete → 0 incomplete (complete)
      // Second call: getLeafCells → no cells
      let callCount = 0;
      mockContainer.items.query = jest.fn().mockImplementation(() => ({
        fetchAll: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return { resources: [0] }; // isGridComplete
          return { resources: [] }; // getLeafCells
        }),
      }));

      const result = await mergeService.optimizeGrid("v1", "v2");
      expect(result).toBeNull();
    });

    it("should optimize a complete grid and persist new cells", async () => {
      const leafCells = [
        createCell({
          id: "a",
          boundaryBox: { minLat: 48.0, minLon: 9.0, maxLat: 48.05, maxLon: 9.05 },
          resultsCount: 10,
        }),
        createCell({
          id: "b",
          boundaryBox: { minLat: 48.05, minLon: 9.0, maxLat: 48.1, maxLon: 9.05 },
          resultsCount: 15,
        }),
        createCell({
          id: "c",
          boundaryBox: { minLat: 48.5, minLon: 9.5, maxLat: 48.55, maxLon: 9.55 },
          resultsCount: 30,
        }),
      ];

      let callCount = 0;
      mockContainer.items.query = jest.fn().mockImplementation(() => ({
        fetchAll: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return { resources: [0] }; // isGridComplete
          return { resources: leafCells }; // getLeafCells
        }),
      }));

      const result = await mergeService.optimizeGrid("v1", "v2");

      expect(result).not.toBeNull();
      expect(result?.sourceGridVersion).toBe("v1");
      expect(result?.targetGridVersion).toBe("v2");
      expect(result?.originalLeafCellCount).toBe(3);
      expect(result?.mergedCellCount).toBe(2); // A+B merged, C stays
      expect(result?.cellsSaved).toBe(1);

      // Should persist 2 cells with new gridVersion
      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(2);
      const upsertedCells = (mockContainer.items.upsert as jest.Mock).mock.calls.map(
        (call: any[]) => call[0] as GridCell
      );
      expect(upsertedCells.every((c: GridCell) => c.gridVersion === "v2")).toBe(true);
      expect(upsertedCells.every((c: GridCell) => c.status === "PENDING")).toBe(true);
    });

    it("should preserve resultsCount in optimized cells", async () => {
      const leafCells = [
        createCell({
          id: "a",
          boundaryBox: { minLat: 48.0, minLon: 9.0, maxLat: 48.05, maxLon: 9.05 },
          resultsCount: 10,
        }),
        createCell({
          id: "b",
          boundaryBox: { minLat: 48.05, minLon: 9.0, maxLat: 48.1, maxLon: 9.05 },
          resultsCount: 15,
        }),
      ];

      let callCount = 0;
      mockContainer.items.query = jest.fn().mockImplementation(() => ({
        fetchAll: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return { resources: [0] };
          return { resources: leafCells };
        }),
      }));

      await mergeService.optimizeGrid("v1", "v2");

      const upsertedCell = (mockContainer.items.upsert as jest.Mock).mock.calls[0][0] as GridCell;
      expect(upsertedCell.resultsCount).toBe(25);
      expect(upsertedCell.foundPlaceIds).toEqual([]);
    });
  });
});
