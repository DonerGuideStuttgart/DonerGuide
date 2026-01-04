#!/usr/bin/env bun
/**
 * Full Production Workflow Test
 *
 * This script simulates the complete production pipeline:
 * 1. Generate uniform tiled grid (like gridGenerator.ts)
 * 2. Process each grid point (like placeSearch.ts)
 * 3. Automatically handle subdivisions
 * 4. Save all places to JSON file
 * 5. Track comprehensive statistics
 *
 * Usage: bun test-full-production-workflow.ts [--max-points N] [--output FILE]
 *
 * Examples:
 *   bun test-full-production-workflow.ts                           # Full Stuttgart scan
 *   bun test-full-production-workflow.ts --max-points 10           # Test first 10 points only
 *   bun test-full-production-workflow.ts --output my-results.json  # Custom output file
 *
 * Requires:
 *   - GOOGLE_PLACES_API_KEY
 */

import { writeFileSync } from "fs";
import { generateUniformTiledGrid } from "./src/services/gridService";
import { processGridPointLogic } from "./src/functions/placeSearch";
import { googlePlaceToPlace } from "./src/mappers/placeMapper";
import { API_CONFIG } from "./src/config/searchConfig";
import { SUBDIVISION_CONFIG } from "./src/config/adaptiveGridConfig";
import type { GridPointMessage } from "./src/types/grid.types";
import type { PlaceSearchResult } from "./src/types/placeSearchResult.types";

// ============================================================================
// Configuration
// ============================================================================

interface CliArgs {
  maxPoints: number | null;
  outputFile: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const config: CliArgs = {
    maxPoints: null,
    outputFile: "../stuttgart-doener-results.json",
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--max-points" && args[i + 1]) {
      config.maxPoints = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--output" && args[i + 1]) {
      config.outputFile = args[i + 1];
      i++;
    }
  }

  return config;
}

// ============================================================================
// Statistics & Results
// ============================================================================

interface SearchResult {
  gridPoint: GridPointMessage;
  placesFound: number;
  uniquePlaces: number;
  subdivided: boolean;
  childCells: GridPointMessage[];
  duration: number;
  error?: string;
}

interface Statistics {
  // Grid statistics
  initialGridPoints: number;
  totalSearchesPerformed: number;
  totalSubdivisions: number;

  // Place statistics
  totalPlacesFound: number;
  uniquePlacesMap: Map<string, PlaceSearchResult>; // id -> PlaceSearchResult

  // Performance metrics
  totalDuration: number;
  totalApiCalls: number;

  // Depth breakdown
  byDepth: Map<
    number,
    {
      searches: number;
      placesFound: number;
      subdivisions: number;
    }
  >;

  // Query breakdown (NEW: Track per-query performance)
  byQuery: Map<
    string,
    {
      totalResults: number; // Total results found by this query across all grid points
      uniquePlaces: Set<string>; // Unique place IDs found by this query
    }
  >;
}

function createEmptyStatistics(): Statistics {
  return {
    initialGridPoints: 0,
    totalSearchesPerformed: 0,
    totalSubdivisions: 0,
    totalPlacesFound: 0,
    uniquePlacesMap: new Map(),
    totalDuration: 0,
    totalApiCalls: 0,
    byDepth: new Map(),
    byQuery: new Map(), // Initialize empty query stats
  };
}

// ============================================================================
// Core Processing Logic
// ============================================================================

/**
 * Process a single grid point (uses same business logic as production placeSearch.ts)
 */
async function processGridPoint(gridPoint: GridPointMessage, stats: Statistics): Promise<SearchResult> {
  const startTime = Date.now();
  const depth = gridPoint.subdivisionDepth;

  console.log(`\n📍 Processing: ${gridPoint.id}`);
  console.log(`   Depth: ${depth}, ` + `Cell: ${gridPoint.cellSideKm.toFixed(2)}km`);
  console.log(`   Coords: [${gridPoint.coordinates[0].toFixed(6)}, ${gridPoint.coordinates[1].toFixed(6)}]`);

  try {
    // Use SHARED business logic (same as production!)
    const result = await processGridPointLogic(gridPoint);

    stats.totalApiCalls += API_CONFIG.textQueries.length; // Track actual API calls (one per query)
    console.log(`   ✓ Found ${result.resultCount} places (max across queries)`);

    // Log per-query results
    for (const qr of result.queryResults) {
      console.log(`      - "${qr.query}": ${qr.resultCount} results`);
    }

    // Test-specific: In-memory storage instead of Cosmos DB
    let newPlacesCount = 0;
    // Process per-query results (same as production handler)
    for (const queryResult of result.queryResults) {
      // Initialize query stats if not exists
      if (!stats.byQuery.has(queryResult.query)) {
        stats.byQuery.set(queryResult.query, {
          totalResults: 0,
          uniquePlaces: new Set(),
        });
      }

      const queryStats = stats.byQuery.get(queryResult.query);
      if (!queryStats) continue;
      queryStats.totalResults += queryResult.resultCount;

      for (const googlePlace of queryResult.places) {
        try {
          const place = googlePlaceToPlace(googlePlace, queryResult.query);

          // Track unique places for this query
          queryStats.uniquePlaces.add(place.id);

          if (!stats.uniquePlacesMap.has(place.id)) {
            stats.uniquePlacesMap.set(place.id, place);
            newPlacesCount++;
          } else {
            // Merge foundViaQueries when place already exists
            const existingPlace = stats.uniquePlacesMap.get(place.id);
            if (existingPlace) {
              const mergedQueries = Array.from(new Set([...existingPlace.foundViaQueries, ...place.foundViaQueries]));
              stats.uniquePlacesMap.set(place.id, { ...place, foundViaQueries: mergedQueries });
            }
          }
        } catch (placeError) {
          console.warn(`   ⚠️  Failed to process place ${googlePlace.id}:`, placeError);
        }
      }
    }

    if (newPlacesCount > 0) {
      console.log(`   💾 Stored ${newPlacesCount} new unique places`);
    }

    // Test-specific: Log subdivision (production queues to Service Bus)
    if (result.childCells.length > 0) {
      console.log(`   🔄 Subdivision: ${result.childCells.length} child cells created`);
      stats.totalSubdivisions++;
    } else if (result.needsSubdivision) {
      console.log(`   ⚠️  Cannot subdivide further (depth/cell size limit reached)`);
    }

    // Update statistics
    const duration = Date.now() - startTime;
    stats.totalSearchesPerformed++;
    stats.totalPlacesFound += result.resultCount;
    stats.totalDuration += duration;

    // Update depth stats
    if (!stats.byDepth.has(depth)) {
      stats.byDepth.set(depth, { searches: 0, placesFound: 0, subdivisions: 0 });
    }
    const depthStats = stats.byDepth.get(depth);
    if (depthStats) {
      depthStats.searches++;
      depthStats.placesFound += result.resultCount;
      if (result.needsSubdivision && result.childCells.length > 0) {
        depthStats.subdivisions++;
      }
    }

    console.log(`   ⏱️  Completed in ${duration}ms`);

    return {
      gridPoint,
      placesFound: result.resultCount,
      uniquePlaces: result.places.length,
      subdivided: result.needsSubdivision,
      childCells: result.childCells,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.log(`   ❌ Error: ${errorMessage}`);

    return {
      gridPoint,
      placesFound: 0,
      uniquePlaces: 0,
      subdivided: false,
      childCells: [],
      duration,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Main Workflow
// ============================================================================

async function runFullProductionWorkflow(): Promise<void> {
  const config = parseArgs();
  const overallStart = Date.now();

  console.log("╔════════════════════════════════════════════════════════════════════════╗");
  console.log("║           Full Production Workflow Test - Stuttgart Döner             ║");
  console.log("╚════════════════════════════════════════════════════════════════════════╝\n");

  // Environment validation happens automatically when searchConfig is imported (module-level)
  // If validation fails, the script will exit before reaching this point
  console.log("🔍 Environment validated");
  console.log("   ✓ Google Places API key configured");
  console.log("   ✓ Cosmos DB connection configured");
  console.log("   ✓ Service Bus connection configured");

  // Display configuration
  console.log("\n📋 Configuration:");
  console.log(`   Output file: ${config.outputFile}`);
  console.log(`   Max points: ${config.maxPoints ?? "unlimited (full Stuttgart)"}`);
  console.log(`   Subdivision threshold: ${SUBDIVISION_CONFIG.threshold} results`);
  console.log(`   Max subdivision depth: ${SUBDIVISION_CONFIG.maxDepth}`);

  // Initialize statistics
  const stats = createEmptyStatistics();

  // Step 1: Generate Grid
  console.log("\n" + "─".repeat(80));
  console.log("📐 Step 1: Generating uniform tiled grid for Stuttgart...\n");

  const grid = generateUniformTiledGrid();

  console.log(`✓ Generated ${grid.totalPoints} uniform grid points (4.5km cells)`);
  console.log(`  Bounding box: [${grid.boundingBox.map((n) => n.toFixed(4)).join(", ")}]`);
  console.log(`  Coverage: 100% (edge-to-edge tiling, no overlap)`);

  // Step 2: Filter and limit grid points
  let gridPoints = grid.points;

  if (config.maxPoints !== null && gridPoints.length > config.maxPoints) {
    gridPoints = gridPoints.slice(0, config.maxPoints);
    console.log(`\n⚠️  Limited to ${config.maxPoints} points for testing`);
  }

  stats.initialGridPoints = gridPoints.length;

  // Step 3: Process grid points with adaptive subdivision
  console.log("\n" + "─".repeat(80));
  console.log(`🔍 Step 2: Processing ${gridPoints.length} grid points...\n`);
  console.log("=".repeat(80));

  const results: SearchResult[] = [];
  const queue: GridPointMessage[] = [...gridPoints];
  let processedCount = 0;

  while (queue.length > 0) {
    const currentPoint = queue.shift();
    if (!currentPoint) break;
    processedCount++;

    console.log(`\n[${processedCount}/${stats.totalSearchesPerformed + queue.length + 1}]`);

    // Process this grid point
    const result = await processGridPoint(currentPoint, stats);
    results.push(result);

    // Add child cells to queue if subdivided
    if (result.childCells.length > 0) {
      console.log(`   → Adding ${result.childCells.length} child cells to queue`);
      queue.push(...result.childCells);
    }

    // Rate limiting between requests
    if (queue.length > 0) {
      const delay = API_CONFIG.rateLimitMs;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const overallDuration = Date.now() - overallStart;

  // Step 4: Save results to file
  console.log("\n" + "─".repeat(80));
  console.log(`\n💾 Saving results to ${config.outputFile}...`);

  const outputData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalDuration: overallDuration,
      configuration: {
        maxPoints: config.maxPoints,
        subdivisionThreshold: SUBDIVISION_CONFIG.threshold,
        maxSubdivisionDepth: SUBDIVISION_CONFIG.maxDepth,
      },
      grid: {
        initialPoints: stats.initialGridPoints,
        totalSearches: stats.totalSearchesPerformed,
        totalSubdivisions: stats.totalSubdivisions,
        boundingBox: grid.boundingBox,
      },
    },
    statistics: {
      totalPlacesFound: stats.totalPlacesFound,
      uniquePlacesCount: stats.uniquePlacesMap.size,
      totalApiCalls: stats.totalApiCalls,
      averagePlacesPerSearch: stats.totalPlacesFound / stats.totalSearchesPerformed,
      averageSearchTimeMs: stats.totalDuration / stats.totalSearchesPerformed,
      byDepth: Object.fromEntries(stats.byDepth),
      byQuery: Object.fromEntries(
        Array.from(stats.byQuery.entries()).map(([query, data]) => [
          query,
          {
            totalResults: data.totalResults,
            uniquePlacesCount: data.uniquePlaces.size,
            deduplicationRate: data.totalResults > 0 ? (1 - data.uniquePlaces.size / data.totalResults) * 100 : 0,
          },
        ])
      ),
    },
    places: Array.from(stats.uniquePlacesMap.values()).map((placeSearchResult) => {
      // Extract Place (without foundViaQueries) for storage
      const { foundViaQueries: _foundViaQueries, ...place } = placeSearchResult;
      return place;
    }),
  };

  try {
    writeFileSync(config.outputFile, JSON.stringify(outputData, null, 2), "utf-8");
    console.log(`   ✓ Saved ${stats.uniquePlacesMap.size} unique places to ${config.outputFile}`);
  } catch (error) {
    console.error(`   ❌ Failed to write file: ${String(error)}`);
  }

  // Step 5: Display comprehensive results
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 FINAL RESULTS\n");
  console.log("=".repeat(80));

  // Overall summary
  console.log("\n🎯 Overall Summary:");
  console.log(`   Initial grid points:        ${stats.initialGridPoints}`);
  console.log(`   Total searches performed:   ${stats.totalSearchesPerformed}`);
  console.log(`   Total subdivisions:         ${stats.totalSubdivisions}`);
  console.log(`   Total places found:         ${stats.totalPlacesFound}`);
  console.log(`   Unique places stored:       ${stats.uniquePlacesMap.size}`);
  console.log(`   Total API calls:            ${stats.totalApiCalls}`);
  console.log(`   Total duration:             ${(overallDuration / 1000).toFixed(1)}s`);
  console.log(`   Avg time per search:        ${(stats.totalDuration / stats.totalSearchesPerformed).toFixed(0)}ms`);
  console.log(`   Avg places per search:      ${(stats.totalPlacesFound / stats.totalSearchesPerformed).toFixed(1)}`);

  // Query breakdown (NEW)
  console.log("\n🔍 Statistics by Query:");
  if (stats.byQuery.size > 0) {
    const queryEntries = Array.from(stats.byQuery.entries());
    const totalUniquePlacesAcrossAllQueries = stats.uniquePlacesMap.size;

    for (const [query, queryData] of queryEntries) {
      const uniqueCount = queryData.uniquePlaces.size;
      const dedupeRate =
        queryData.totalResults > 0 ? ((1 - uniqueCount / queryData.totalResults) * 100).toFixed(1) : "0";

      console.log(`\n   "${query}":`);
      console.log(`     Total results:        ${queryData.totalResults}`);
      console.log(`     Unique places:        ${uniqueCount}`);
      console.log(`     Deduplication rate:   ${dedupeRate}%`);
    }

    // Cross-query overlap analysis
    if (queryEntries.length > 1) {
      console.log(`\n   Cross-Query Analysis:`);
      console.log(`     Total unique places across all queries: ${totalUniquePlacesAcrossAllQueries}`);

      // Calculate overlap between queries
      const allQueryPlaces = new Set<string>();
      queryEntries.forEach(([, data]) => {
        data.uniquePlaces.forEach((id) => allQueryPlaces.add(id));
      });

      const totalFromAllQueries = Array.from(queryEntries).reduce((sum, [, data]) => sum + data.uniquePlaces.size, 0);
      const overlapCount = totalFromAllQueries - allQueryPlaces.size;
      const overlapRate = totalFromAllQueries > 0 ? ((overlapCount / totalFromAllQueries) * 100).toFixed(1) : "0";

      console.log(`     Places found by multiple queries: ${overlapCount} (${overlapRate}% overlap)`);
    }
  } else {
    console.log("   No query data available");
  }

  // Depth breakdown
  if (stats.byDepth.size > 0) {
    console.log("\n🔢 Statistics by Subdivision Depth:");
    const sortedDepths = Array.from(stats.byDepth.entries()).sort((a, b) => a[0] - b[0]);
    for (const [depth, depthData] of sortedDepths) {
      console.log(`\n   Depth ${depth}:`);
      console.log(`     Searches:       ${depthData.searches}`);
      console.log(`     Places found:   ${depthData.placesFound}`);
      console.log(`     Subdivisions:   ${depthData.subdivisions}`);
      console.log(`     Avg places:     ${(depthData.placesFound / depthData.searches).toFixed(1)}`);
    }
  }

  // Subdivision analysis
  console.log("\n🔄 Subdivision Analysis:");
  const subdivisionRate = (stats.totalSubdivisions / stats.totalSearchesPerformed) * 100;
  console.log(`   Subdivision rate:           ${subdivisionRate.toFixed(1)}%`);
  console.log(`   Cells that subdivided:      ${stats.totalSubdivisions}/${stats.totalSearchesPerformed}`);
  console.log(`   Additional searches from subdivisions: ${stats.totalSearchesPerformed - stats.initialGridPoints}`);

  const subdividedResults = results.filter((r) => r.subdivided && r.childCells.length > 0);
  if (subdividedResults.length > 0) {
    console.log(`\n   Cells that triggered subdivision (${subdividedResults.length}):`);
    for (const result of subdividedResults.slice(0, 10)) {
      // Show first 10
      console.log(
        `     • ${result.gridPoint.id}: ${result.placesFound} results (depth ${result.gridPoint.subdivisionDepth})`
      );
    }
    if (subdividedResults.length > 10) {
      console.log(`     ... and ${subdividedResults.length - 10} more`);
    }
  }

  // Error analysis
  const errors = results.filter((r) => r.error != null);
  if (errors.length > 0) {
    console.log(`\n⚠️  Errors Encountered (${errors.length}):`);
    for (const error of errors) {
      console.log(`   • ${error.gridPoint.id}: ${error.error}`);
    }
  }

  // Final summary
  console.log("\n" + "=".repeat(80));
  console.log(`\n✅ Workflow completed successfully!`);
  console.log(`   Total time: ${(overallDuration / 1000).toFixed(1)}s`);
  console.log(`   Unique Döner locations in Stuttgart: ${stats.uniquePlacesMap.size}`);
  console.log(`   Results saved to: ${config.outputFile}`);

  console.log("\n" + "=".repeat(80));
}

// ============================================================================
// Entry Point
// ============================================================================

runFullProductionWorkflow().catch((error: unknown) => {
  console.error("\n" + "=".repeat(80));
  console.error("❌ FATAL ERROR\n");
  console.error(error);
  console.error("\n" + "=".repeat(80));
  process.exit(1);
});
