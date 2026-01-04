#!/usr/bin/env bun
/**
 * Systematic Coverage Test for Stuttgart Search Grid
 *
 * Tests whether the generated search grid with perfect tiling
 * fully covers Stuttgart without gaps using a systematic grid scan approach.
 *
 * Approach:
 * 1. Generate the actual search grid (tiled)
 * 2. Create a fine-grained test grid (100m spacing) within Stuttgart borders
 * 3. For each test point, check if it's covered by any search rectangle
 * 4. Report coverage percentage and identify gap locations
 * 5. Optionally export gaps as GeoJSON for visualization
 *
 * Usage: bun test-coverage-scan.ts [testGridSpacingKm] [--export-geojson]
 * Example: bun test-coverage-scan.ts 0.1 --export-geojson
 */

import { generateUniformTiledGrid } from "../src/services/gridService";
import pointGrid from "@turf/point-grid";
import bbox from "@turf/bbox";
import type { Feature, MultiPolygon, Point as GeoPoint, FeatureCollection } from "geojson";
import type { Rectangle } from "../src/types/grid.types";
import stuttgartBorders from "../src/data/stuttgart_borders.json";
import { writeFileSync } from "fs";

/**
 * Checks if a point is inside a rectangle using simple lat/lng bounds check
 *
 * This is sufficient for Stuttgart's small area where lat/lng rectangles
 * are approximately rectangular without significant geodesic distortion.
 *
 * @param lat - Point latitude
 * @param lng - Point longitude
 * @param rect - Rectangle to check
 * @returns true if point is inside rectangle
 */
function isPointInRectangle(lat: number, lng: number, rect: Rectangle): boolean {
  return (
    lat >= rect.low.latitude && lat <= rect.high.latitude && lng >= rect.low.longitude && lng <= rect.high.longitude
  );
}

/**
 * Checks if a point is covered by any search rectangle in the grid
 *
 * @param lat - Point latitude
 * @param lng - Point longitude
 * @param searchRectangles - Array of search rectangles
 * @returns true if point is covered by at least one rectangle
 */
function isPointCovered(lat: number, lng: number, searchRectangles: Rectangle[]): boolean {
  return searchRectangles.some((rect) => isPointInRectangle(lat, lng, rect));
}

/**
 * Result of coverage analysis
 */
interface CoverageResult {
  totalPoints: number;
  coveredPoints: number;
  gapPoints: number;
  coveragePercent: number;
  gapLocations: { lng: number; lat: number }[];
}

/**
 * Performs systematic grid scan to test coverage
 *
 * @param searchRectangles - Array of search rectangles from the grid
 * @param stuttgartFeature - Stuttgart boundary polygon
 * @param testGridSpacingKm - Spacing for test grid in kilometers
 * @returns Coverage analysis results
 */
function performCoverageScan(
  searchRectangles: Rectangle[],
  stuttgartFeature: Feature<MultiPolygon>,
  testGridSpacingKm: number
): CoverageResult {
  const bboxCoords = bbox(stuttgartFeature);

  console.log(`\nGenerating test grid with ${testGridSpacingKm * 1000}m spacing...`);

  // Generate test points on a regular grid within Stuttgart borders
  const testGrid: FeatureCollection<GeoPoint> = pointGrid(bboxCoords, testGridSpacingKm, {
    units: "kilometers",
    mask: stuttgartFeature, // Only include points within Stuttgart
  });

  console.log(`Testing ${testGrid.features.length} grid points...`);

  let coveredPoints = 0;
  const gapLocations: { lng: number; lat: number }[] = [];

  // Check coverage for each test point
  for (const feature of testGrid.features) {
    const [lng, lat] = feature.geometry.coordinates;

    if (isPointCovered(lat, lng, searchRectangles)) {
      coveredPoints++;
    } else {
      gapLocations.push({ lng, lat });
    }
  }

  const totalPoints = testGrid.features.length;
  const gapPoints = totalPoints - coveredPoints;
  const coveragePercent = (coveredPoints / totalPoints) * 100;

  return {
    totalPoints,
    coveredPoints,
    gapPoints,
    coveragePercent,
    gapLocations,
  };
}

/**
 * Exports gap locations as GeoJSON for visualization
 *
 * @param gapLocations - Array of gap coordinates
 * @param outputPath - Path to output GeoJSON file
 */
function exportGapsAsGeoJSON(gapLocations: { lng: number; lat: number }[], outputPath: string): void {
  const geojson = {
    type: "FeatureCollection",
    features: gapLocations.map(({ lng, lat }) => ({
      type: "Feature",
      properties: {
        type: "coverage-gap",
      },
      geometry: {
        type: "Point",
        coordinates: [lng, lat],
      },
    })),
  };

  writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
  console.log(`\nGap locations exported to: ${outputPath}`);
  console.log("View at: https://geojson.io");
}

/**
 * Exports search rectangles as GeoJSON for visualization
 *
 * @param searchRectangles - Array of search rectangles
 * @param gridPoints - Grid points with metadata
 * @param outputPath - Path to output GeoJSON file
 */
function exportSearchRectanglesAsGeoJSON(
  searchRectangles: Rectangle[],
  gridPoints: { id: string }[],
  outputPath: string
): void {
  const geojson = {
    type: "FeatureCollection",
    features: searchRectangles.map((rect, idx) => ({
      type: "Feature",
      properties: {
        type: "search-rectangle",
        id: gridPoints[idx]?.id || `rect_${idx}`,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [rect.low.longitude, rect.low.latitude], // SW
            [rect.high.longitude, rect.low.latitude], // SE
            [rect.high.longitude, rect.high.latitude], // NE
            [rect.low.longitude, rect.high.latitude], // NW
            [rect.low.longitude, rect.low.latitude], // Close polygon
          ],
        ],
      },
    })),
  };

  writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
  console.log(`Search rectangles exported to: ${outputPath}`);
}

// Main test execution
console.log("=== Systematic Grid Coverage Test ===\n");

try {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const testGridSpacingKm = args[0] ? parseFloat(args[0]) : 0.1; // Default: 100m
  const exportGeoJSON = args.includes("--export-geojson") || args.includes("--export");

  console.log(`Configuration:`);
  console.log(`  Test grid spacing: ${testGridSpacingKm * 1000}m`);
  console.log(`  GeoJSON export: ${exportGeoJSON ? "enabled" : "disabled"}`);

  // Generate the uniform tiled search grid
  console.log("\nGenerating uniform tiled search grid (4.5km cells)...");
  const startTime = Date.now();
  const searchGrid = generateUniformTiledGrid();
  const gridGenTime = Date.now() - startTime;

  console.log(`✓ Generated ${searchGrid.totalPoints} search grid points in ${gridGenTime}ms`);

  // Extract all search rectangles
  const searchRectangles = searchGrid.points.map((p) => p.searchRectangle);

  // Cast Stuttgart borders
  const stuttgartGeometry = stuttgartBorders as MultiPolygon;
  const stuttgartFeature: Feature<MultiPolygon> = {
    type: "Feature",
    properties: {},
    geometry: stuttgartGeometry,
  };

  // Perform coverage scan
  console.log("\n=== Coverage Analysis ===");
  const scanStartTime = Date.now();
  const result = performCoverageScan(searchRectangles, stuttgartFeature, testGridSpacingKm);
  const scanTime = Date.now() - scanStartTime;

  // Display results
  console.log(`\nResults (completed in ${scanTime}ms):`);
  console.log(`  Total test points: ${result.totalPoints.toLocaleString()}`);
  console.log(`  Covered points: ${result.coveredPoints.toLocaleString()}`);
  console.log(`  Gap points: ${result.gapPoints.toLocaleString()}`);
  console.log(`  Coverage: ${result.coveragePercent.toFixed(2)}%`);

  // Export GeoJSON if requested
  if (exportGeoJSON) {
    console.log("\n=== GeoJSON Export ===");
    if (result.gapPoints > 0) {
      exportGapsAsGeoJSON(result.gapLocations, "../coverage-gaps.geojson");
    } else {
      console.log("No gaps to export!");
    }
    exportSearchRectanglesAsGeoJSON(searchRectangles, searchGrid.points, "../search-rectangles.geojson");
  }

  // Summary and recommendations
  console.log("\n=== Summary ===");
  if (result.coveragePercent === 100) {
    console.log("✓ Perfect coverage! No gaps detected.");
  } else if (result.coveragePercent >= 99.5) {
    console.log("✓ Excellent coverage (≥99.5%)");
    console.log("⚠️  Minor gaps detected - likely at zone boundaries or city borders");
  } else if (result.coveragePercent >= 95) {
    console.log("⚠️  Good coverage but has some gaps (95-99.5%)");
    console.log("Recommendation: Check tiling logic or reduce granularity");
  } else {
    console.log("❌ Coverage has significant gaps (<95%)");
    console.log("Recommendation: Review grid configuration and tiling logic");
  }

  // Show sample gap locations if any
  if (result.gapPoints > 0 && result.gapPoints <= 20) {
    console.log("\nGap locations:");
    result.gapLocations.forEach(({ lng, lat }, idx) => {
      console.log(`  ${idx + 1}. [${lng.toFixed(6)}, ${lat.toFixed(6)}]`);
    });
  } else if (result.gapPoints > 20) {
    console.log(`\nFirst 10 gap locations:`);
    result.gapLocations.slice(0, 10).forEach(({ lng, lat }, idx) => {
      console.log(`  ${idx + 1}. [${lng.toFixed(6)}, ${lat.toFixed(6)}]`);
    });
    console.log(`  ... and ${result.gapPoints - 10} more gaps`);
    console.log("\nUse --export-geojson to export all gap locations for visualization");
  }

  console.log("\n✓ Coverage test completed successfully!");

  // Exit with error code if coverage is not perfect (for CI/CD)
  if (result.coveragePercent < 100) {
    process.exit(1);
  }
} catch (error) {
  console.error("\n❌ Error:", error instanceof Error ? error.message : error);
  if (error instanceof Error && error.stack != null) {
    console.error("\nStack trace:");
    console.error(error.stack);
  }
  process.exit(1);
}
