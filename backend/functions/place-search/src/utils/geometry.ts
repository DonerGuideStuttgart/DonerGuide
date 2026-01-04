/**
 * Geometry Utilities for Rectangle-based Grid System
 *
 * This module provides functions for creating and manipulating rectangles
 * for the Google Places search grid using perfect rectangle tiling.
 * All functions use geodesic calculations to account for Earth's curvature.
 */

import type { Rectangle } from "../types/grid.types";
import type { Feature, MultiPolygon } from "geojson";
import { point, polygon } from "@turf/helpers";
import distance from "@turf/distance";
import booleanIntersects from "@turf/boolean-intersects";

/**
 * Earth's radius in kilometers
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Converts kilometers to degrees (Latitude)
 *
 * Latitude conversion is constant at all latitudes.
 *
 * @param km - Distance in kilometers
 * @returns Degrees of latitude
 */
export function kmToDegreesLat(km: number): number {
  return (km / EARTH_RADIUS_KM) * (180 / Math.PI);
}

/**
 * Converts kilometers to degrees (Longitude)
 *
 * Longitude conversion varies with latitude due to Earth's curvature.
 *
 * @param km - Distance in kilometers
 * @param latitude - Latitude at which to calculate
 * @returns Degrees of longitude
 */
export function kmToDegreesLng(km: number, latitude: number): number {
  return (km / (EARTH_RADIUS_KM * Math.cos((latitude * Math.PI) / 180))) * (180 / Math.PI);
}

/**
 * Creates a rectangle from its southwest corner (edge-based tiling)
 *
 * This is the primary function for perfect rectangle tiling.
 * Rectangles are created edge-to-edge starting from the SW corner.
 *
 * @param swLat - Southwest corner latitude
 * @param swLng - Southwest corner longitude
 * @param widthKm - Rectangle width in kilometers (longitude direction)
 * @param heightKm - Rectangle height in kilometers (latitude direction)
 * @returns Rectangle defined by low/high corners
 *
 * @example
 * // Create a 4.5km × 4.5km rectangle from corner
 * const rect = createRectangleFromCorner(48.7, 9.1, 4.5, 4.5);
 */
export function createRectangleFromCorner(swLat: number, swLng: number, widthKm: number, heightKm: number): Rectangle {
  const latOffset = kmToDegreesLat(heightKm);
  const lngOffset = kmToDegreesLng(widthKm, swLat);

  return {
    low: { latitude: swLat, longitude: swLng },
    high: { latitude: swLat + latOffset, longitude: swLng + lngOffset },
  };
}

/**
 * Checks if a rectangle intersects with a MultiPolygon boundary
 *
 * Used to filter grid cells that overlap with Stuttgart's boundary.
 *
 * @param rect - Rectangle to check
 * @param boundary - MultiPolygon boundary (e.g., Stuttgart borders)
 * @returns True if rectangle intersects boundary
 *
 * @example
 * const rect = createRectangleFromCorner(48.7, 9.1, 4.5, 4.5);
 * const intersects = rectangleIntersectsBoundary(rect, stuttgartFeature);
 */
export function rectangleIntersectsBoundary(rect: Rectangle, boundary: Feature<MultiPolygon>): boolean {
  // Convert rectangle to polygon
  const rectPolygon = polygon([
    [
      [rect.low.longitude, rect.low.latitude],
      [rect.high.longitude, rect.low.latitude],
      [rect.high.longitude, rect.high.latitude],
      [rect.low.longitude, rect.high.latitude],
      [rect.low.longitude, rect.low.latitude],
    ],
  ]);

  return booleanIntersects(rectPolygon, boundary);
}

/**
 * Subdivides a rectangle into 2 equal halves (Binary subdivision)
 *
 * More efficient than 4-way quadtree subdivision:
 * - 1 parent cell → 2 child cells (1 additional API call)
 * - vs. 4-way: 1 parent → 4 children (3 additional API calls)
 * - 67% reduction in subdivision API costs
 *
 * Splits along the longer dimension to maintain roughly square cells.
 * For perfect tiling, children are created edge-to-edge with no gaps.
 *
 * @param rect - Rectangle to subdivide
 * @returns Array of 2 rectangles (halves)
 *
 * @example
 * const parent = createRectangleFromCorner(48.7, 9.1, 4.5, 4.5);
 * const halves = subdivideRectangle(parent);
 * // Each half is 2.25km × 4.5km or 4.5km × 2.25km
 */
export function subdivideRectangle(rect: Rectangle): Rectangle[] {
  const latSpan = rect.high.latitude - rect.low.latitude;
  const lngSpan = rect.high.longitude - rect.low.longitude;

  if (lngSpan >= latSpan) {
    // Split vertically (West and East)
    const midLng = (rect.low.longitude + rect.high.longitude) / 2;
    return [
      { low: rect.low, high: { ...rect.high, longitude: midLng } },
      { low: { ...rect.low, longitude: midLng }, high: rect.high },
    ];
  } else {
    // Split horizontally (South and North)
    const midLat = (rect.low.latitude + rect.high.latitude) / 2;
    return [
      { low: rect.low, high: { ...rect.high, latitude: midLat } },
      { low: { ...rect.low, latitude: midLat }, high: rect.high },
    ];
  }
}

/**
 * Calculates the center point of a rectangle
 *
 * @param rect - Rectangle to find center of
 * @returns Center latitude and longitude
 *
 * @example
 * const center = getRectangleCenter(rect);
 * console.log(`Center: ${center.latitude}, ${center.longitude}`);
 */
export function getRectangleCenter(rect: Rectangle): {
  latitude: number;
  longitude: number;
} {
  return {
    latitude: (rect.low.latitude + rect.high.latitude) / 2,
    longitude: (rect.low.longitude + rect.high.longitude) / 2,
  };
}

/**
 * Calculates the approximate side length of a rectangle in kilometers
 *
 * Uses turf.js for accurate geodesic distance calculations.
 * Assumes rectangle is roughly square (which is true for our grid).
 *
 * @param rect - Rectangle to measure
 * @returns Side length in kilometers
 *
 * @example
 * const sideKm = getRectangleSideLength(rect);
 * console.log(`Cell is ${sideKm.toFixed(2)}km × ${sideKm.toFixed(2)}km`);
 */
export function getRectangleSideLength(rect: Rectangle): number {
  // Calculate distance along the south edge (latitude constant)
  const southWest = point([rect.low.longitude, rect.low.latitude]);
  const southEast = point([rect.high.longitude, rect.low.latitude]);

  const distanceKm = distance(southWest, southEast, { units: "kilometers" });

  return distanceKm;
}
