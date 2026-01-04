/**
 * Google Places API (New) service with Text Search and pagination support
 */

import type { TextSearchRequest, TextSearchResponse, GooglePlace } from "../types/googlePlaces.types";
import type { Rectangle } from "../types/grid.types";
import { buildFieldMask } from "../utils/googlePlaces";
import { API_CONFIG, GOOGLE_PLACES_API_KEY } from "../config/searchConfig";
import { SUBDIVISION_CONFIG } from "../config/adaptiveGridConfig";
import { delay } from "../utils/async";

const GOOGLE_PLACES_API_BASE = "https://places.googleapis.com/v1/places:searchText";

/**
 * Search result with subdivision metadata
 */
export interface SearchResult {
  places: GooglePlace[];
  needsSubdivision: boolean;
  resultCount: number;
}

/**
 * Performs a Text Search with automatic pagination and subdivision detection
 *
 * Detects if the search area is too dense and needs subdivision based on:
 * - Result count exceeding threshold (default 55)
 * - Current subdivision depth below maximum
 *
 * @param query - Search query (e.g., "Döner")
 * @param searchRectangle - Rectangle defining search area (with overlap applied)
 * @param currentDepth - Current subdivision depth (0 for initial grid)
 * @returns SearchResult with places and subdivision metadata
 */
export async function textSearchWithSubdivisionDetection(
  query: string,
  searchRectangle: Rectangle,
  currentDepth: number
): Promise<SearchResult> {
  const allPlaces: GooglePlace[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;

  do {
    const response = await textSearchRequest(query, searchRectangle, pageToken);

    if (response.places) {
      allPlaces.push(...response.places);
    }

    pageToken = response.nextPageToken;
    pageCount++;

    // If there's a next page, wait before requesting (Google requirement)
    if (pageToken !== undefined && pageCount < API_CONFIG.maxPaginationPages) {
      await delay(API_CONFIG.paginationDelayMs);
    }
  } while (pageToken !== undefined && pageCount < API_CONFIG.maxPaginationPages);

  // Determine if subdivision is needed
  const resultCount = allPlaces.length;
  const needsSubdivision = resultCount >= SUBDIVISION_CONFIG.threshold && currentDepth < SUBDIVISION_CONFIG.maxDepth;

  return {
    places: allPlaces,
    needsSubdivision,
    resultCount,
  };
}

/**
 * Performs a single Text Search API request
 *
 * @param query - Search query (e.g., "Döner")
 * @param searchRectangle - Rectangle defining search area
 * @param pageToken - Optional token for pagination
 * @returns Search response from Google Places API
 */
async function textSearchRequest(
  query: string,
  searchRectangle: Rectangle,
  pageToken?: string
): Promise<TextSearchResponse> {
  const requestBody: TextSearchRequest = {
    textQuery: query,
    // Use rectangle directly for locationRestriction
    // Google Places API (New) requires rectangles for precise area limiting
    locationRestriction: {
      rectangle: searchRectangle,
    },
    maxResultCount: API_CONFIG.maxResultCount,
    languageCode: API_CONFIG.languageCode,
  };

  // Add pageToken for pagination
  if (pageToken !== undefined && pageToken !== "") {
    requestBody.pageToken = pageToken;
  }

  let lastError: Error | null = null;

  for (let retry = 0; retry <= API_CONFIG.maxRetries; retry++) {
    try {
      const response = await fetch(GOOGLE_PLACES_API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": buildFieldMask(API_CONFIG.fields),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Rate limited - exponential backoff
        if (response.status === 429) {
          const backoffMs = Math.pow(2, retry) * 1000;
          console.warn(
            `Google Places API: Rate limited (429). Retrying in ${backoffMs}ms... (Attempt ${retry + 1}/${API_CONFIG.maxRetries + 1})`
          );
          await delay(backoffMs);
          continue;
        }

        // Server error - retry with backoff
        if (response.status >= 500) {
          const backoffMs = Math.pow(2, retry) * 1000;
          console.warn(
            `Google Places API: Server error (${response.status}). Retrying in ${backoffMs}ms... (Attempt ${retry + 1}/${API_CONFIG.maxRetries + 1})`
          );
          await delay(backoffMs);
          continue;
        }

        // Client error - don't retry
        console.error(`Google Places API: Client error ${response.status}: ${errorText}`);
        throw new Error(`Google Places API Error ${String(response.status)}: ${errorText}`);
      }

      const data = (await response.json()) as TextSearchResponse;
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Network error - retry with backoff
      if (retry < API_CONFIG.maxRetries) {
        const backoffMs = Math.pow(2, retry) * 1000;
        console.warn(
          `Google Places API: Network error (${lastError.message}). Retrying in ${backoffMs}ms... (Attempt ${retry + 1}/${API_CONFIG.maxRetries + 1})`
        );
        await delay(backoffMs);
      } else {
        console.error(`Google Places API: Max retries reached or fatal error: ${lastError.message}`);
      }
    }
  }

  throw lastError ?? new Error("Unknown error in Google Places API request");
}
