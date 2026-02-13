import { getStuttgartBBox, cellIntersectsBoundary } from "../geometry.util";

describe("geometry.util", () => {
  describe("getStuttgartBBox", () => {
    it("should return plausible Stuttgart coordinates", () => {
      const bbox = getStuttgartBBox();

      // Stuttgart is roughly around 48.7°N, 9.1-9.3°E
      expect(bbox.minLat).toBeGreaterThan(48.6);
      expect(bbox.minLat).toBeLessThan(48.8);
      expect(bbox.maxLat).toBeGreaterThan(48.8);
      expect(bbox.maxLat).toBeLessThan(48.9);
      expect(bbox.minLon).toBeGreaterThan(9.0);
      expect(bbox.minLon).toBeLessThan(9.1);
      expect(bbox.maxLon).toBeGreaterThan(9.2);
      expect(bbox.maxLon).toBeLessThan(9.4);
    });
  });

  describe("cellIntersectsBoundary", () => {
    it("should return true for Stuttgart city center", () => {
      const result = cellIntersectsBoundary({
        minLat: 48.77,
        minLon: 9.17,
        maxLat: 48.78,
        maxLon: 9.19,
      });
      expect(result).toBe(true);
    });

    it("should return false for Munich (far away)", () => {
      const result = cellIntersectsBoundary({
        minLat: 48.1,
        minLon: 11.5,
        maxLat: 48.2,
        maxLon: 11.6,
      });
      expect(result).toBe(false);
    });

    it("should return true for a cell at the city edge (partial overlap)", () => {
      // Cell overlapping Stuttgart-Vaihingen area at the southern border
      const result = cellIntersectsBoundary({
        minLat: 48.71,
        minLon: 9.1,
        maxLat: 48.73,
        maxLon: 9.12,
      });
      expect(result).toBe(true);
    });

    it("should return false for a cell just outside the bounding box", () => {
      const bbox = getStuttgartBBox();
      const result = cellIntersectsBoundary({
        minLat: bbox.maxLat + 0.1,
        minLon: bbox.maxLon + 0.1,
        maxLat: bbox.maxLat + 0.2,
        maxLon: bbox.maxLon + 0.2,
      });
      expect(result).toBe(false);
    });
  });
});
