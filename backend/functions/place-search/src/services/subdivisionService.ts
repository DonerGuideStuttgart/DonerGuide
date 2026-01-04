/**
 * Subdivision Service for Adaptive Grid
 *
 * Handles recursive subdivision of grid cells when result density is too high.
 * Uses binary subdivision: splits a rectangle into 2 equal halves.
 *.
 */

import type { GridPointMessage } from "../types/grid.types";
import { SUBDIVISION_CONFIG } from "../config/adaptiveGridConfig";
import { subdivideRectangle, getRectangleCenter } from "../utils/geometry";

/**
 * Subdivides a grid cell into 2 halves (binary split)
 *
 * Creates 2 child cells by splitting the parent rectangle along its longer dimension.
 *
 * Algorithm:
 * 1. Validate subdivision is allowed
 * 2. Subdivide parent's search rectangle into 2 equal halves
 * 3. Create GridPointMessage for each half with halved cell size
 *
 * @param parent - Parent grid cell to subdivide
 * @returns Array of 2 child grid cells, or empty array if subdivision not allowed
 */
export function subdivideCell(parent: GridPointMessage): GridPointMessage[] {
  if (!canSubdivide(parent.subdivisionDepth, parent.cellSideKm)) {
    return [];
  }

  const childRects = subdivideRectangle(parent.searchRectangle);
  const childDepth = parent.subdivisionDepth + 1;
  const childCellSize = parent.cellSideKm / 2;

  return childRects.map((rect, index) => {
    const center = getRectangleCenter(rect);
    return {
      id: `${parent.id}_${index}_L${childDepth}`,
      coordinates: [center.longitude, center.latitude],
      cellSideKm: childCellSize,
      searchRectangle: rect, // Exaktes Rechteck, kein Overlap
      subdivisionDepth: childDepth,
      parentId: parent.id,
    };
  });
}

/**
 * Determines if a grid cell can be subdivided
 *
 * Checks against two limits:
 * 1. Maximum subdivision depth (prevents infinite recursion)
 * 2. Minimum cell size (prevents impractically small areas)
 *
 * @param currentDepth - Current subdivision depth
 * @param currentCellSideKm - Current cell side length in kilometers
 * @returns true if subdivision is allowed, false otherwise
 */
export function canSubdivide(currentDepth: number, currentCellSideKm: number): boolean {
  // Check depth limit
  if (currentDepth >= SUBDIVISION_CONFIG.maxDepth) {
    return false;
  }

  // Check minimum cell size
  // Child cell side would be currentCellSideKm / 2
  const childCellSideKm = currentCellSideKm / 2;
  const minCellSideKm = SUBDIVISION_CONFIG.minRadiusM / 1000; // Convert to km

  if (childCellSideKm < minCellSideKm) {
    return false;
  }

  return true;
}

/**
 * Determines if subdivision is needed based on result count
 *
 * @param resultCount - Number of places found in search
 * @param currentDepth - Current subdivision depth
 * @returns true if subdivision should occur, false otherwise
 */
export function needsSubdivision(resultCount: number, currentDepth: number): boolean {
  // Check if result count exceeds threshold
  if (resultCount < SUBDIVISION_CONFIG.threshold) {
    return false;
  }

  // Check if subdivision is allowed at this depth
  return currentDepth < SUBDIVISION_CONFIG.maxDepth;
}

/**
 * Calculates the expected child cell side length after subdivision
 *
 * @param parentCellSideKm - Parent cell side length in kilometers
 * @returns Child cell side length in kilometers
 */
export function calculateChildCellSide(parentCellSideKm: number): number {
  return parentCellSideKm / 2;
}
