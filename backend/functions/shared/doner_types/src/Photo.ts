export interface Photo {
  id: string;
  url: string;
  mimeType: string;
  category: "food" | "place" | "uncategorized" | "ai_generated";
  confidence: number | undefined;
}
