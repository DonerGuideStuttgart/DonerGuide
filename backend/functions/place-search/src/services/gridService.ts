/**
 * Grid Service for Stuttgart Grid Generation
 *
 * Generates a uniform grid with perfect rectangle tiling for 100% coverage.
 */

import bbox from "@turf/bbox";
import type { Feature, MultiPolygon } from "geojson";
import type { GridPointMessage, StuttgartGrid } from "../types/grid.types";
import { BASE_CELL_SIZE_KM } from "../config/adaptiveGridConfig";
import {
  createRectangleFromCorner,
  kmToDegreesLat,
  kmToDegreesLng,
  getRectangleCenter,
  rectangleIntersectsBoundary,
} from "../utils/geometry";
import stuttgartBorders from "../data/stuttgart_borders.json";

/**
 * Generates a uniform grid with perfect rectangle tiling
 *
 * Creates edge-to-edge rectangles covering Stuttgart with 100% coverage.
 *
 * Algorithm:
 * 1. Get bounding box of Stuttgart
 * 2. Calculate degree increments for BASE_CELL_SIZE_KM
 * 3. Tile rectangles from SW corner
 * 4. Include rectangle if it intersects Stuttgart boundary
 *
 * @returns Stuttgart grid with perfect tiling
 */
export function generateUniformTiledGrid(): StuttgartGrid {
  const stuttgartFeature: Feature<MultiPolygon> = {
    type: "Feature",
    properties: {},
    geometry: stuttgartBorders as MultiPolygon,
  };

  const [minLng, minLat, maxLng, maxLat] = bbox(stuttgartFeature);

  const latIncrement = kmToDegreesLat(BASE_CELL_SIZE_KM);

  const allPoints: GridPointMessage[] = [];
  let pointIndex = 0;

  // Tile from SW corner
  let currentLat = minLat;
  while (currentLat < maxLat) {
    // Longitude increment must be recalculated at EACH latitude
    // because longitudes converge towards the pole (prevent gaps).
    const lngIncrement = kmToDegreesLng(BASE_CELL_SIZE_KM, currentLat);

    let currentLng = minLng;
    while (currentLng < maxLng) {
      const rect = createRectangleFromCorner(currentLat, currentLng, BASE_CELL_SIZE_KM, BASE_CELL_SIZE_KM);

      // Only include if it overlaps Stuttgart
      if (rectangleIntersectsBoundary(rect, stuttgartFeature)) {
        const center = getRectangleCenter(rect);

        allPoints.push({
          id: `grid_${pointIndex}_${center.longitude.toFixed(4)}_${center.latitude.toFixed(4)}`,
          coordinates: [center.longitude, center.latitude],
          cellSideKm: BASE_CELL_SIZE_KM,
          searchRectangle: rect, // Exact rectangle, no overlap
          subdivisionDepth: 0,
        });
        pointIndex++;
      }

      currentLng += lngIncrement;
    }
    currentLat += latIncrement;
  }

  return {
    points: allPoints,
    boundingBox: [minLng, minLat, maxLng, maxLat],
    generatedAt: new Date(),
    totalPoints: allPoints.length,
  };
}
