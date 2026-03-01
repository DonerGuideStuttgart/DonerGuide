import bbox from "@turf/bbox";
import booleanIntersects from "@turf/boolean-intersects";
import { multiPolygon, polygon } from "@turf/helpers";
import stuttgartBorders from "../data/stuttgart_borders.json";
import type { GridCell } from "../types/grid";

const stuttgartFeature = multiPolygon(stuttgartBorders.coordinates);

/**
 * Calculates the bounding box (bbox) of Stuttgart's city boundaries.
 *
 * This function uses the Turf.js library to compute the smallest rectangular
 * bounding box that fully contains the Stuttgart city boundary polygon.
 *
 * **Important:** Coordinates use GeoJSON format (longitude, latitude), which is
 * the opposite of the common (latitude, longitude) ordering. The Turf.js bbox
 * function returns [minLon, minLat, maxLon, maxLat].
 *
 * @returns {GridCell["boundaryBox"]} An object containing the min/max latitude
 *   and longitude coordinates defining Stuttgart's bounding box.
 * @example
 * const bbox = getStuttgartBBox();
 * // Returns: { minLat: 48.6923..., minLon: 9.0391..., maxLat: 48.8663..., maxLon: 9.3159... }
 */
export function getStuttgartBBox(): GridCell["boundaryBox"] {
  const [minLon, minLat, maxLon, maxLat] = bbox(stuttgartFeature);
  return { minLat, minLon, maxLat, maxLon };
}

/**
 * Checks whether a grid cell intersects with Stuttgart's city boundaries.
 *
 * This function converts the cell's bounding box into a GeoJSON polygon and
 * uses Turf.js's booleanIntersects to test for intersection with Stuttgart's
 * boundary. Returns true if the cell overlaps (even partially) with the city area.
 *
 * **Important:** Coordinates use GeoJSON format (longitude, latitude), which is
 * the opposite of the common (latitude, longitude) ordering. The polygon
 * coordinates must be provided as [lon, lat] pairs.
 *
 * @param {GridCell["boundaryBox"]} cellBBox - The bounding box of the grid cell,
 *   containing minLat, minLon, maxLat, and maxLon properties.
 * @returns {boolean} True if the cell intersects with Stuttgart's boundaries,
 *   false otherwise.
 * @example
 * const isInside = cellIntersectsBoundary({
 *   minLat: 48.77,
 *   minLon: 9.17,
 *   maxLat: 48.78,
 *   maxLon: 9.19
 * });
 * // Returns: true (Stuttgart city center)
 */
export function cellIntersectsBoundary(cellBBox: GridCell["boundaryBox"]): boolean {
  const { minLat, minLon, maxLat, maxLon } = cellBBox;
  const cellPolygon = polygon([
    [
      [minLon, minLat],
      [maxLon, minLat],
      [maxLon, maxLat],
      [minLon, maxLat],
      [minLon, minLat],
    ],
  ]);
  return booleanIntersects(cellPolygon, stuttgartFeature);
}
