/**
 * Grid-related type definitions for Stuttgart Döner search
 */

/**
 * Rectangle defined by southwest and northeast corners
 * Used for Google Places API locationRestriction
 */
export interface Rectangle {
  low: { latitude: number; longitude: number }; // Southwest corner
  high: { latitude: number; longitude: number }; // Northeast corner
}

export interface GridPointMessage {
  id: string;
  coordinates: [number, number]; // [longitude, latitude] - CENTER of rectangle (GeoJSON format)

  // Rectangle-based search area
  cellSideKm: number; // Cell side length in km
  searchRectangle: Rectangle; // Rectangle used directly for Google API

  // Subdivision tracking
  subdivisionDepth: number; // 0 = initial grid, 1-5 = subdivided
  parentId?: string; // ID of parent cell (if subdivided)
}

export interface StuttgartGrid {
  points: GridPointMessage[];
  boundingBox: [number, number, number, number]; // [minX, minY, maxX, maxY]
  generatedAt: Date;
  totalPoints: number;
}
