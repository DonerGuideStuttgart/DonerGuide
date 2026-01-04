import { GOOGLE_PLACES_API_KEY } from "../config/searchConfig";

/**
 * Constructs a full Google Places Photo URL from a photo reference
 *
 * Use this function at runtime to generate photo URLs.
 * Photo references are stored without API keys in the database.
 *
 * @param photoReference - The photo reference (e.g., "places/xxx/photos/yyy")
 * @param maxHeightPx - Maximum height in pixels (default: 400)
 * @param maxWidthPx - Maximum width in pixels (default: 400)
 * @returns Full photo URL with API key
 */
export function getPhotoUrl(photoReference: string, maxHeightPx = 400, maxWidthPx = 400): string {
  return `https://places.googleapis.com/v1/${photoReference}/media?maxHeightPx=${String(maxHeightPx)}&maxWidthPx=${String(maxWidthPx)}&key=${GOOGLE_PLACES_API_KEY}`;
}
