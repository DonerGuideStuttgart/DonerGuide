/**
 * Benchmark script to compare three grid strategies against the real
 * Google Places API and counting total API requests.
 *
 * Strategies:
 *   1. Original (main): 4x4 grid, degree-based splitting, no boundary filter
 *   2. Branch 99: 4x4 grid + boundary filter, degree-based splitting + boundary filter
 *   3. Geodetic: TARGET_CELL_SIZE_KM grid, km-based splitting, boundary filter
 *
 * Usage:
 *   GOOGLE_PLACES_API_KEY=<key> npx tsx src/scripts/benchmark-grid.ts
 *
 * Optional env vars:
 *   DRY_RUN=true  — use mock data instead of real API calls
 */

import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import type { GridCell } from "../types/grid";
import {
  getStuttgartBBox,
  cellIntersectsBoundary,
  kmToDegreesLat,
  kmToDegreesLng,
  getCellSideKm,
} from "../utils/geometry.util";
import { MergeService } from "../services/merge.service";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
const mergeService = new MergeService({} as any); // Dummy container since we only need the in-memory merge logic

// ─── Config ──────────────────────────────────────────────────────────────────

const TARGET_CELL_SIZE_KM = 7;
const MAX_LEVEL = 10;
const MAX_PAGES_PER_CELL = 3;
const SPLIT_THRESHOLD = 55;
const API_DELAY_MS = 200;

const BENCHMARK_CONFIG = {
  /** Original: 4x4 grid, degree-based splitting, no boundary filter */
  original: false,
  /** Branch 99: 4x4 grid + boundary filter, degree-based splitting + boundary filter */
  branch99BoundaryFilter: false,
  /** Current: geodetic TARGET_CELL_SIZE_KM grid, km-based splitting, boundary filter */
  geodeticTargetSize: false,
  /** Geodetic + Merge: cold-start → merge leaf cells → warm-start on merged grid */
  geodeticWithMerge: true,
  /** Load cells from file if available (true = warm-start, false = fresh start) */
  resumeFromFile: false,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Lightweight API search (minimal FieldMask) ─────────────────────────────

interface LightweightSearchResult {
  placeIds: string[];
  pageCount: number;
}

async function searchAllPagesLightweight(
  apiKey: string,
  bbox: GridCell["boundaryBox"]
): Promise<LightweightSearchResult> {
  const url = "https://places.googleapis.com/v1/places:searchText";
  const fieldMask = "places.id,places.displayName,nextPageToken";

  const allPlaceIds: string[] = [];
  let pageToken: string | undefined = undefined;
  let pageCount = 0;

  do {
    const body: Record<string, unknown> = {
      textQuery: "Döner",
      locationRestriction: {
        rectangle: {
          low: { latitude: bbox.minLat, longitude: bbox.minLon },
          high: { latitude: bbox.maxLat, longitude: bbox.maxLon },
        },
      },
      languageCode: "de",
    };
    if (pageToken) {
      body.pageToken = pageToken;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Places API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as {
      places?: { id: string }[];
      nextPageToken?: string;
    };

    if (data.places) {
      for (const p of data.places) {
        allPlaceIds.push(p.id);
      }
    }

    pageToken = data.nextPageToken;
    pageCount++;

    if (pageToken && pageCount < MAX_PAGES_PER_CELL) {
      await sleep(API_DELAY_MS);
    }
  } while (pageToken && pageCount < MAX_PAGES_PER_CELL);

  return { placeIds: allPlaceIds, pageCount };
}

// ─── Grid creation helpers ──────────────────────────────────────────────────

function makeCell(bbox: GridCell["boundaryBox"], level: number): GridCell {
  return {
    id: uuidv4(),
    gridVersion: "benchmark",
    level,
    status: "PENDING",
    boundaryBox: bbox,
    geometry: {
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
    },
    resultsCount: 0,
    foundPlaceIds: [],
    lastProcessedAt: new Date(0).toISOString(),
  };
}

/** Original strategy (main): fixed 4x4 grid, no boundary filter. */
function createGrid4x4NoBoundary(): GridCell[] {
  const minLat = 48.692;
  const minLon = 9.038;
  const maxLat = 48.866;
  const maxLon = 9.315;
  const latStep = (maxLat - minLat) / 4;
  const lonStep = (maxLon - minLon) / 4;

  const cells: GridCell[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const bbox = {
        minLat: minLat + i * latStep,
        minLon: minLon + j * lonStep,
        maxLat: minLat + (i + 1) * latStep,
        maxLon: minLon + (j + 1) * lonStep,
      };
      cells.push(makeCell(bbox, 0));
    }
  }
  return cells;
}

/** Branch 99 strategy: fixed 4x4 grid + boundary filter. */
function createGrid4x4(): GridCell[] {
  const { minLat, minLon, maxLat, maxLon } = getStuttgartBBox();
  const latStep = (maxLat - minLat) / 4;
  const lonStep = (maxLon - minLon) / 4;

  const cells: GridCell[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const bbox = {
        minLat: minLat + i * latStep,
        minLon: minLon + j * lonStep,
        maxLat: minLat + (i + 1) * latStep,
        maxLon: minLon + (j + 1) * lonStep,
      };
      if (cellIntersectsBoundary(bbox)) {
        cells.push(makeCell(bbox, 0));
      }
    }
  }
  return cells;
}

/** Geodetic strategy: grid with TARGET_CELL_SIZE_KM side length + boundary filter. */
function createGridTargetSize(targetKm: number): {
  cells: GridCell[];
  totalBeforeFilter: number;
  rows: number;
  cols: number;
} {
  const { minLat, minLon, maxLat, maxLon } = getStuttgartBBox();

  const nominalLatStep = kmToDegreesLat(targetKm);
  const rows = Math.max(1, Math.round((maxLat - minLat) / nominalLatStep));
  const latStep = (maxLat - minLat) / rows;

  const cells: GridCell[] = [];
  let totalBeforeFilter = 0;
  let maxCols = 0;
  for (let i = 0; i < rows; i++) {
    const cellMinLat = minLat + i * latStep;
    const cellMaxLat = minLat + (i + 1) * latStep;
    const centerLat = (cellMinLat + cellMaxLat) / 2;

    const nominalLonStep = kmToDegreesLng(targetKm, centerLat);
    const cols = Math.max(1, Math.round((maxLon - minLon) / nominalLonStep));
    const lonStep = (maxLon - minLon) / cols;
    maxCols = Math.max(maxCols, cols);

    for (let j = 0; j < cols; j++) {
      const cellMinLon = minLon + j * lonStep;
      const cellMaxLon = minLon + (j + 1) * lonStep;

      const bbox = {
        minLat: cellMinLat,
        minLon: cellMinLon,
        maxLat: cellMaxLat,
        maxLon: cellMaxLon,
      };

      totalBeforeFilter++;
      if (cellIntersectsBoundary(bbox)) {
        cells.push(makeCell(bbox, 0));
      }
    }
  }
  return { cells, totalBeforeFilter, rows, cols: maxCols };
}

// ─── Grid info logging ──────────────────────────────────────────────────────

function logGridInfo(cells: GridCell[], totalBeforeFilter?: number, gridRows?: number, gridCols?: number): void {
  if (cells.length === 0) return;

  // Calculate cell size from first cell
  const firstCell = cells[0];
  const { latSideKm, lonSideKm } = getCellSideKm(firstCell.boundaryBox);

  const total = totalBeforeFilter ?? cells.length;
  const filtered = total - cells.length;

  if (gridRows !== undefined && gridCols !== undefined) {
    console.log(`  Grid: ${gridRows}×${gridCols} = ${total} cells`);
  } else {
    console.log(`  Grid: ${total} cells`);
  }
  console.log(`  Cell size: ~${latSideKm.toFixed(1)}km × ~${lonSideKm.toFixed(1)}km`);

  if (filtered > 0) {
    console.log(`  Boundary filter: ${filtered} cells removed → ${cells.length} cells remaining`);
  } else {
    console.log(`  Boundary filter: no cells removed (all ${cells.length} cells intersect boundary)`);
  }
}

// ─── Cell splitting strategies ───────────────────────────────────────────────

/** Original (main): degree-based comparison, always produces 2 children (no boundary filter). */
function splitCellOriginal(cell: GridCell): GridCell[] {
  const { minLat, minLon, maxLat, maxLon } = cell.boundaryBox;
  const latDiff = maxLat - minLat;
  const lonDiff = maxLon - minLon;

  const children: GridCell["boundaryBox"][] = [];

  if (latDiff >= lonDiff) {
    const midLat = minLat + latDiff / 2;
    children.push({ ...cell.boundaryBox, maxLat: midLat });
    children.push({ ...cell.boundaryBox, minLat: midLat });
  } else {
    const midLon = minLon + lonDiff / 2;
    children.push({ ...cell.boundaryBox, maxLon: midLon });
    children.push({ ...cell.boundaryBox, minLon: midLon });
  }

  return children.map((bbox) => makeCell(bbox, cell.level + 1));
}

/** Branch 99: degree-based comparison + boundary filter on children. */
function splitCellDegreeBoundary(cell: GridCell): GridCell[] {
  const { minLat, minLon, maxLat, maxLon } = cell.boundaryBox;
  const latDiff = maxLat - minLat;
  const lonDiff = maxLon - minLon;

  const candidateBBoxes: GridCell["boundaryBox"][] = [];

  if (latDiff >= lonDiff) {
    const midLat = minLat + latDiff / 2;
    candidateBBoxes.push({ ...cell.boundaryBox, maxLat: midLat });
    candidateBBoxes.push({ ...cell.boundaryBox, minLat: midLat });
  } else {
    const midLon = minLon + lonDiff / 2;
    candidateBBoxes.push({ ...cell.boundaryBox, maxLon: midLon });
    candidateBBoxes.push({ ...cell.boundaryBox, minLon: midLon });
  }

  const children = candidateBBoxes
    .filter((bbox) => cellIntersectsBoundary(bbox))
    .map((bbox) => makeCell(bbox, cell.level + 1));
  const filtered = candidateBBoxes.length - children.length;
  if (filtered > 0) {
    console.log(
      `    ↳ Boundary filter removed ${filtered}/${candidateBBoxes.length} child cells at L${cell.level + 1}`
    );
  }
  return children;
}

/** Geodetic (current): km-based comparison via getCellSideKm + boundary filter. */
function splitCellGeodetic(cell: GridCell): GridCell[] {
  const { minLat, minLon, maxLat, maxLon } = cell.boundaryBox;
  const latDiff = maxLat - minLat;
  const lonDiff = maxLon - minLon;

  const candidateBBoxes: GridCell["boundaryBox"][] = [];
  const { latSideKm, lonSideKm } = getCellSideKm(cell.boundaryBox);

  if (latSideKm >= lonSideKm) {
    const midLat = minLat + latDiff / 2;
    candidateBBoxes.push({ ...cell.boundaryBox, maxLat: midLat });
    candidateBBoxes.push({ ...cell.boundaryBox, minLat: midLat });
  } else {
    const midLon = minLon + lonDiff / 2;
    candidateBBoxes.push({ ...cell.boundaryBox, maxLon: midLon });
    candidateBBoxes.push({ ...cell.boundaryBox, minLon: midLon });
  }

  const children = candidateBBoxes
    .filter((bbox) => cellIntersectsBoundary(bbox))
    .map((bbox) => makeCell(bbox, cell.level + 1));
  const filtered = candidateBBoxes.length - children.length;
  if (filtered > 0) {
    console.log(
      `    ↳ Boundary filter removed ${filtered}/${candidateBBoxes.length} child cells at L${cell.level + 1}`
    );
  }
  return children;
}

// ─── File I/O helpers ────────────────────────────────────────────────────────

const BENCHMARK_DATA_DIR = path.join(__dirname, "benchmark-data");

function getDataFilePath(strategyName: string): string {
  const sanitized = strategyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return path.join(BENCHMARK_DATA_DIR, `${sanitized}.json`);
}

function loadCells(filePath: string): GridCell[] | null {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data) as GridCell[];
  } catch {
    return null;
  }
}

function saveCells(filePath: string, cells: GridCell[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(cells, null, 2), "utf-8");
}

// ─── Benchmark runner ───────────────────────────────────────────────────────

interface BenchmarkResult {
  strategyName: string;
  initialCells: number;
  apiRequests: number;
  warmStartApiRequests: number;
  splitCellRequests: number;
  totalPlaces: number;
  uniquePlaces: number;
  splits: number;
  maxLevel: number;
  overflowCells: number;
  resumedFromFile: boolean;
  dataFilePath: string;
}

async function runBenchmark(
  apiKey: string,
  strategyName: string,
  initialCells: GridCell[],
  splitFn: (cell: GridCell) => GridCell[]
): Promise<BenchmarkResult> {
  const dataFilePath = getDataFilePath(strategyName);
  let resumedFromFile = false;
  let allCells: GridCell[];
  const pending: GridCell[] = [];

  if (BENCHMARK_CONFIG.resumeFromFile) {
    const loaded = loadCells(dataFilePath);
    if (loaded) {
      // Warm-start: load saved leaf cells, reset to PENDING, and re-fetch
      // places — simulates the production workflow with a pre-computed grid.
      for (const cell of loaded) {
        cell.status = "PENDING";
        cell.resultsCount = 0;
        cell.foundPlaceIds = [];
      }
      allCells = loaded;
      pending.push(...loaded);
      resumedFromFile = true;
      console.log(`\n--- Warm-start: ${strategyName} (${loaded.length} cells from file) ---`);
    } else {
      allCells = [...initialCells];
      pending.push(...initialCells);
      console.log(`\n--- Running: ${strategyName} (${initialCells.length} initial cells, no file found) ---`);
    }
  } else {
    allCells = [...initialCells];
    pending.push(...initialCells);
    console.log(`\n--- Running: ${strategyName} (${initialCells.length} initial cells) ---`);
  }

  let apiRequests = 0;
  let splitCellRequests = 0;
  let totalPlaces = 0;
  let splits = 0;
  let maxLevel = 0;
  let overflowCells = 0;
  const uniquePlaceIds = new Set<string>();

  let processed = 0;
  while (pending.length > 0) {
    const cell = pending.shift();
    if (!cell) break;
    processed++;

    const { placeIds, pageCount } = await searchAllPagesLightweight(apiKey, cell.boundaryBox);
    apiRequests += pageCount;
    totalPlaces += placeIds.length;
    for (const id of placeIds) {
      uniquePlaceIds.add(id);
    }

    if (placeIds.length >= SPLIT_THRESHOLD) {
      if (cell.level >= MAX_LEVEL) {
        cell.status = "COMPLETED";
        cell.resultsCount = placeIds.length;
        cell.foundPlaceIds = placeIds;
        overflowCells++;
        console.log(`  [${processed}] Cell at MAX_LEVEL ${cell.level} — overflow (${placeIds.length} results)`);
      } else {
        cell.status = "SPLIT";
        cell.resultsCount = placeIds.length;
        cell.foundPlaceIds = placeIds;
        splitCellRequests += pageCount;
        const children = splitFn(cell);
        pending.push(...children);
        allCells.push(...children);
        splits++;
        maxLevel = Math.max(maxLevel, cell.level + 1);
        console.log(
          `  [${processed}] Split L${cell.level} → ${children.length} children (${placeIds.length} results, ${pending.length} pending)`
        );
      }
    } else {
      cell.status = "COMPLETED";
      cell.resultsCount = placeIds.length;
      cell.foundPlaceIds = placeIds;
      console.log(`  [${processed}] Completed L${cell.level} — ${placeIds.length} results (${pending.length} pending)`);
    }

    cell.lastProcessedAt = new Date().toISOString();

    if (pending.length > 0) {
      await sleep(API_DELAY_MS);
    }
  }

  // Only save leaf cells (COMPLETED) — the final grid for warm-start runs.
  const leafCells = allCells.filter((c) => c.status === "COMPLETED");
  saveCells(dataFilePath, leafCells);

  return {
    strategyName,
    initialCells: initialCells.length,
    apiRequests,
    warmStartApiRequests: apiRequests - splitCellRequests,
    splitCellRequests,
    totalPlaces,
    uniquePlaces: uniquePlaceIds.size,
    splits,
    maxLevel,
    overflowCells,
    resumedFromFile,
    dataFilePath: path.relative(process.cwd(), dataFilePath),
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error(
      "Error: GOOGLE_PLACES_API_KEY env variable is required.\n" +
        "Usage: GOOGLE_PLACES_API_KEY=<key> npx tsx src/scripts/benchmark-grid.ts"
    );
    process.exit(1);
  }

  console.log("=== Grid Strategy Benchmark ===");
  console.log(`TARGET_CELL_SIZE_KM = ${TARGET_CELL_SIZE_KM}`);
  console.log(`SPLIT_THRESHOLD = ${SPLIT_THRESHOLD}`);
  console.log(`MAX_LEVEL = ${MAX_LEVEL}`);
  console.log(
    `Enabled strategies: ${Object.entries(BENCHMARK_CONFIG)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ")}`
  );

  const results: BenchmarkResult[] = [];

  // --- Strategy 1: Original (main) ---
  if (BENCHMARK_CONFIG.original) {
    const grid = createGrid4x4NoBoundary();
    logGridInfo(grid);
    const result = await runBenchmark(apiKey, "Original (4x4, degree split, no boundary)", grid, splitCellOriginal);
    results.push(result);
  }

  // --- Strategy 2: Branch 99 (4x4 + Boundary) ---
  if (BENCHMARK_CONFIG.branch99BoundaryFilter) {
    const grid = createGrid4x4();
    logGridInfo(grid);
    const result = await runBenchmark(
      apiKey,
      "Branch 99 (4x4 + boundary filter, degree split)",
      grid,
      splitCellDegreeBoundary
    );
    results.push(result);
  }

  // --- Strategy 3: Geodetic (current) ---
  if (BENCHMARK_CONFIG.geodeticTargetSize) {
    const { cells: grid, totalBeforeFilter, rows: gRows, cols: gCols } = createGridTargetSize(TARGET_CELL_SIZE_KM);
    logGridInfo(grid, totalBeforeFilter, gRows, gCols);
    const result = await runBenchmark(
      apiKey,
      `Geodetic (${TARGET_CELL_SIZE_KM}km, km split + boundary)`,
      grid,
      splitCellGeodetic
    );
    results.push(result);
  }

  // --- Strategy 4: Geodetic + Merge ---
  if (BENCHMARK_CONFIG.geodeticWithMerge) {
    const strategyLabel = `Geodetic+Merge (${TARGET_CELL_SIZE_KM}km)`;

    // 1. Create geodetic grid
    const { cells: grid, totalBeforeFilter, rows: gRows, cols: gCols } = createGridTargetSize(TARGET_CELL_SIZE_KM);
    logGridInfo(grid, totalBeforeFilter, gRows, gCols);

    // 2. Cold-Start: run benchmark with splits (same as geodeticTargetSize)
    const coldResult = await runBenchmark(apiKey, `${strategyLabel} Cold-Start`, grid, splitCellGeodetic);

    // 3. Load leaf cells from the file that runBenchmark() just saved
    const leafCells = loadCells(getDataFilePath(coldResult.strategyName));
    if (!leafCells || leafCells.length === 0) {
      console.error("Error: No leaf cells found after cold-start run.");
    } else {
      // 4. Merge leaf cells (in-memory, no API calls)
      const mergedCells = mergeService.performMerges(leafCells);
      const cellsSaved = leafCells.length - mergedCells.length;
      console.log(`\n  Merge: ${leafCells.length} → ${mergedCells.length} cells (${cellsSaved} saved)`);

      // 5. Warm-Start: re-run benchmark on merged cells (no splits expected)
      // Reset merged cells to PENDING state for the warm-start run
      for (const cell of mergedCells) {
        cell.status = "PENDING";
        cell.resultsCount = 0;
        cell.foundPlaceIds = [];
      }

      const warmResult = await runBenchmark(
        apiKey,
        `${strategyLabel} Warm-Start (merged)`,
        mergedCells,
        splitCellGeodetic
      );
      results.push(warmResult);

      // Also push cold-start result for comparison
      results.push(coldResult);
    }
  }

  // --- Results table ---
  console.log("\n=== Benchmark Results ===\n");

  for (const r of results) {
    const savedPct = r.apiRequests > 0 ? ((r.splitCellRequests / r.apiRequests) * 100).toFixed(1) : "0.0";
    console.log(`Strategy: ${r.strategyName}`);
    console.log(`  Initial cells:           ${r.initialCells}`);
    console.log(`  Total API requests:      ${r.apiRequests}   (Cold-Start: alle Zellen)`);
    console.log(`  Warm-Start API requests: ${r.warmStartApiRequests}   (ohne SPLIT-Zellen)`);
    console.log(`  Saved requests:          ${r.splitCellRequests}    (${savedPct}% Ersparnis)`);
    console.log(`  Total splits:            ${r.splits}`);
    console.log(`  Max split level:         ${r.maxLevel}`);
    console.log(`  Overflow cells:          ${r.overflowCells}`);
    console.log(`  Total places found:      ${r.totalPlaces}`);
    console.log(`  Unique places:           ${r.uniquePlaces}`);
    console.log(`  Resumed from file:       ${r.resumedFromFile ? "yes" : "no"}`);
    console.log(`  Cells saved to:          ${r.dataFilePath}`);
    console.log();
  }

  // --- Pairwise comparison ---
  if (results.length >= 2) {
    console.log("=== Pairwise Comparison (API Requests) ===\n");
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const a = results[i];
        const b = results[j];
        const diff = a.apiRequests - b.apiRequests;
        const pct = a.apiRequests > 0 ? ((diff / a.apiRequests) * 100).toFixed(1) : "N/A";

        if (diff > 0) {
          console.log(`${b.strategyName} saves ${diff} requests vs ${a.strategyName} (${pct}% reduction)`);
        } else if (diff < 0) {
          console.log(
            `${b.strategyName} uses ${Math.abs(diff)} MORE requests vs ${a.strategyName} (${Math.abs(Number(pct))}% increase)`
          );
        } else {
          console.log(`${a.strategyName} vs ${b.strategyName}: same number of requests`);
        }
      }
    }
  }
}

main().catch((err: unknown) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
