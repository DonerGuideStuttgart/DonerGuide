export interface Photo {
  id: string;
  url: string;
  mimeType: string;
  category: "food" | "place" | "uncategorized";
  confidence: number;
}
