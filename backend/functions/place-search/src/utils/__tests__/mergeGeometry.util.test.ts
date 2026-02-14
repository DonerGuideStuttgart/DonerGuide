import {
  coordEqual,
  shareFullLatEdge,
  shareFullLonEdge,
  mergeBoundingBoxes,
  bboxToGeometry,
} from "../mergeGeometry.util";

describe("mergeGeometry.util", () => {
  describe("coordEqual", () => {
    it("should return true for identical values", () => {
      expect(coordEqual(48.123, 48.123)).toBe(true);
    });

    it("should return true for values within epsilon", () => {
      expect(coordEqual(48.123, 48.123 + 1e-10)).toBe(true);
    });

    it("should return false for values beyond epsilon", () => {
      expect(coordEqual(48.123, 48.123 + 1e-8)).toBe(false);
    });

    it("should handle zero", () => {
      expect(coordEqual(0, 0)).toBe(true);
      expect(coordEqual(0, 1e-10)).toBe(true);
      expect(coordEqual(0, 1e-8)).toBe(false);
    });

    it("should handle negative values", () => {
      expect(coordEqual(-9.5, -9.5)).toBe(true);
      expect(coordEqual(-9.5, -9.5 + 1e-10)).toBe(true);
    });
  });

  describe("shareFullLatEdge", () => {
    it("should detect cells sharing a top/bottom edge", () => {
      const cellA = { minLat: 48.0, minLon: 9.0, maxLat: 48.5, maxLon: 9.5 };
      const cellB = { minLat: 48.5, minLon: 9.0, maxLat: 49.0, maxLon: 9.5 };
      expect(shareFullLatEdge(cellA, cellB)).toBe(true);
      expect(shareFullLatEdge(cellB, cellA)).toBe(true);
    });

    it("should reject cells with different lon bounds", () => {
      const cellA = { minLat: 48.0, minLon: 9.0, maxLat: 48.5, maxLon: 9.5 };
      const cellB = { minLat: 48.5, minLon: 9.0, maxLat: 49.0, maxLon: 9.25 };
      expect(shareFullLatEdge(cellA, cellB)).toBe(false);
    });

    it("should reject non-adjacent cells with same lon bounds", () => {
      const cellA = { minLat: 48.0, minLon: 9.0, maxLat: 48.5, maxLon: 9.5 };
      const cellB = { minLat: 49.0, minLon: 9.0, maxLat: 49.5, maxLon: 9.5 };
      expect(shareFullLatEdge(cellA, cellB)).toBe(false);
    });

    it("should reject partial lat edges (different levels)", () => {
      // Level-0 cell vs half-width Level-1 cell
      const cellA = { minLat: 48.0, minLon: 9.0, maxLat: 48.5, maxLon: 9.5 };
      const cellB = { minLat: 48.5, minLon: 9.0, maxLat: 49.0, maxLon: 9.25 };
      expect(shareFullLatEdge(cellA, cellB)).toBe(false);
    });

    it("should reject overlapping cells", () => {
      const cellA = { minLat: 48.0, minLon: 9.0, maxLat: 48.5, maxLon: 9.5 };
      const cellB = { minLat: 48.2, minLon: 9.0, maxLat: 48.7, maxLon: 9.5 };
      expect(shareFullLatEdge(cellA, cellB)).toBe(false);
    });
  });

  describe("shareFullLonEdge", () => {
    it("should detect cells sharing a left/right edge", () => {
      const cellA = { minLat: 48.0, minLon: 9.0, maxLat: 48.5, maxLon: 9.5 };
      const cellB = { minLat: 48.0, minLon: 9.5, maxLat: 48.5, maxLon: 10.0 };
      expect(shareFullLonEdge(cellA, cellB)).toBe(true);
      expect(shareFullLonEdge(cellB, cellA)).toBe(true);
    });

    it("should reject cells with different lat bounds", () => {
      const cellA = { minLat: 48.0, minLon: 9.0, maxLat: 48.5, maxLon: 9.5 };
      const cellB = { minLat: 48.0, minLon: 9.5, maxLat: 48.25, maxLon: 10.0 };
      expect(shareFullLonEdge(cellA, cellB)).toBe(false);
    });

    it("should reject non-adjacent cells with same lat bounds", () => {
      const cellA = { minLat: 48.0, minLon: 9.0, maxLat: 48.5, maxLon: 9.5 };
      const cellB = { minLat: 48.0, minLon: 10.0, maxLat: 48.5, maxLon: 10.5 };
      expect(shareFullLonEdge(cellA, cellB)).toBe(false);
    });

    it("should reject partial lon edges (different levels)", () => {
      const cellA = { minLat: 48.0, minLon: 9.0, maxLat: 48.5, maxLon: 9.5 };
      const cellB = { minLat: 48.0, minLon: 9.5, maxLat: 48.25, maxLon: 10.0 };
      expect(shareFullLonEdge(cellA, cellB)).toBe(false);
    });
  });

  describe("mergeBoundingBoxes", () => {
    it("should merge two vertically adjacent bboxes", () => {
      const a = { minLat: 48.0, minLon: 9.0, maxLat: 48.5, maxLon: 9.5 };
      const b = { minLat: 48.5, minLon: 9.0, maxLat: 49.0, maxLon: 9.5 };
      const merged = mergeBoundingBoxes(a, b);
      expect(merged).toEqual({ minLat: 48.0, minLon: 9.0, maxLat: 49.0, maxLon: 9.5 });
    });

    it("should merge two horizontally adjacent bboxes", () => {
      const a = { minLat: 48.0, minLon: 9.0, maxLat: 48.5, maxLon: 9.5 };
      const b = { minLat: 48.0, minLon: 9.5, maxLat: 48.5, maxLon: 10.0 };
      const merged = mergeBoundingBoxes(a, b);
      expect(merged).toEqual({ minLat: 48.0, minLon: 9.0, maxLat: 48.5, maxLon: 10.0 });
    });
  });

  describe("bboxToGeometry", () => {
    it("should create a valid GeoJSON Polygon", () => {
      const bbox = { minLat: 48.0, minLon: 9.0, maxLat: 48.5, maxLon: 9.5 };
      const geo = bboxToGeometry(bbox);

      expect(geo.type).toBe("Polygon");
      expect(geo.coordinates).toHaveLength(1);
      expect(geo.coordinates[0]).toHaveLength(5);
      // First and last point should be the same (closed ring)
      expect(geo.coordinates[0][0]).toEqual(geo.coordinates[0][4]);
      // Verify GeoJSON order [lon, lat]
      expect(geo.coordinates[0][0]).toEqual([9.0, 48.0]);
      expect(geo.coordinates[0][1]).toEqual([9.5, 48.0]);
      expect(geo.coordinates[0][2]).toEqual([9.5, 48.5]);
      expect(geo.coordinates[0][3]).toEqual([9.0, 48.5]);
    });
  });
});
