export interface GridCell {
  id: string;             // UUID
  gridVersion: string;    // z.B. "2026-01-02-stuttgart"
  level: number;          // Splitting-Tiefe
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'SPLIT';
  geometry: {             // GeoJSON Polygon für Spatial Queries
    type: "Polygon";
    coordinates: number[][][];
  };
  boundaryBox: { 
    minLat: number; 
    minLon: number; 
    maxLat: number; 
    maxLon: number; 
  };
  resultsCount: number;
  foundPlaceIds: string[];
  lastProcessedAt: string;
}
