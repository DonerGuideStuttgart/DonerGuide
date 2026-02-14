import {
  getStuttgartBBox,
  cellIntersectsBoundary,
  kmToDegreesLat,
  kmToDegreesLng,
  getCellSideKm,
  KM_PER_DEGREE_LAT,
} from "../geometry.util";

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

  describe("kmToDegreesLat", () => {
    it("should convert km to latitude degrees", () => {
      // KM_PER_DEGREE_LAT km = 1 degree of latitude
      expect(kmToDegreesLat(KM_PER_DEGREE_LAT)).toBeCloseTo(1.0, 5);
      expect(kmToDegreesLat(5)).toBeCloseTo(5 / KM_PER_DEGREE_LAT, 5);
    });
  });

  describe("kmToDegreesLng", () => {
    it("should convert km to longitude degrees at the equator", () => {
      // At equator (0°), 1° lon ≈ KM_PER_DEGREE_LAT km
      expect(kmToDegreesLng(KM_PER_DEGREE_LAT, 0)).toBeCloseTo(1.0, 4);
    });

    it("should return larger degree values at higher latitudes", () => {
      // At 48° latitude, 1° lon is shorter in km, so more degrees per km
      const atEquator = kmToDegreesLng(5, 0);
      const at48 = kmToDegreesLng(5, 48);
      expect(at48).toBeGreaterThan(atEquator);
    });

    it("should be approximately correct for Stuttgart latitude", () => {
      // At ~48.7°N, 1° lon ≈ 73.5 km, so 5 km ≈ 0.068°
      const degrees = kmToDegreesLng(5, 48.7);
      expect(degrees).toBeCloseTo(0.068, 2);
    });
  });

  describe("getCellSideKm", () => {
    it("should return correct side lengths for a known bbox", () => {
      const bbox = { minLat: 48.0, minLon: 9.0, maxLat: 49.0, maxLon: 10.0 };
      const { latSideKm, lonSideKm } = getCellSideKm(bbox);

      // 1° lat ≈ KM_PER_DEGREE_LAT km
      expect(latSideKm).toBeCloseTo(KM_PER_DEGREE_LAT, 1);
      // 1° lon at 48.5° ≈ KM_PER_DEGREE_LAT * cos(48.5°) ≈ 73.7 km
      expect(lonSideKm).toBeCloseTo(KM_PER_DEGREE_LAT * Math.cos((48.5 * Math.PI) / 180), 1);
    });

    it("should show that lon side is shorter than lat side at Stuttgart latitude", () => {
      // Equal degree differences, but lon should be shorter in km
      const bbox = { minLat: 48.7, minLon: 9.1, maxLat: 48.8, maxLon: 9.2 };
      const { latSideKm, lonSideKm } = getCellSideKm(bbox);

      expect(latSideKm).toBeGreaterThan(lonSideKm);
    });
  });
});
