import bbox from "@turf/bbox";
import booleanIntersects from "@turf/boolean-intersects";
import { multiPolygon, polygon } from "@turf/helpers";
import stuttgartBorders from "../data/stuttgart_borders.json";
import type { GridCell } from "../types/grid";

const stuttgartFeature = multiPolygon(stuttgartBorders.coordinates);

export function getStuttgartBBox(): GridCell["boundaryBox"] {
  const [minLon, minLat, maxLon, maxLat] = bbox(stuttgartFeature);
  return { minLat, minLon, maxLat, maxLon };
}

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
