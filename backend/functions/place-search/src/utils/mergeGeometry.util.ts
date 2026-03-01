import type { GridCell } from "../types/grid";

const EPSILON = 1e-9;

/** Compares two coordinate values with epsilon tolerance for floating-point precision. */
export function coordEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

/**
 * Checks whether two cells share a full horizontal edge (vertical neighbors).
 * Requires identical lon bounds and adjacent lat boundary.
 */
export function shareFullLatEdge(a: GridCell["boundaryBox"], b: GridCell["boundaryBox"]): boolean {
  const sameLonBounds = coordEqual(a.minLon, b.minLon) && coordEqual(a.maxLon, b.maxLon);
  if (!sameLonBounds) return false;
  return coordEqual(a.maxLat, b.minLat) || coordEqual(a.minLat, b.maxLat);
}

/**
 * Checks whether two cells share a full vertical edge (horizontal neighbors).
 * Requires identical lat bounds and adjacent lon boundary.
 */
export function shareFullLonEdge(a: GridCell["boundaryBox"], b: GridCell["boundaryBox"]): boolean {
  const sameLatBounds = coordEqual(a.minLat, b.minLat) && coordEqual(a.maxLat, b.maxLat);
  if (!sameLatBounds) return false;
  return coordEqual(a.maxLon, b.minLon) || coordEqual(a.minLon, b.maxLon);
}

/** Computes the union bounding box of two cells. */
export function mergeBoundingBoxes(a: GridCell["boundaryBox"], b: GridCell["boundaryBox"]): GridCell["boundaryBox"] {
  return {
    minLat: Math.min(a.minLat, b.minLat),
    minLon: Math.min(a.minLon, b.minLon),
    maxLat: Math.max(a.maxLat, b.maxLat),
    maxLon: Math.max(a.maxLon, b.maxLon),
  };
}

/** Creates a GeoJSON Polygon from a bounding box. */
export function bboxToGeometry(bbox: GridCell["boundaryBox"]): GridCell["geometry"] {
  return {
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
  };
}
