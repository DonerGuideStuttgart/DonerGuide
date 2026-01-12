import { ResponseFormatJSONSchema } from "openai/resources/shared";

export interface StoreAnalysis {
  bewertungstext: string;
  score_geschmack: number;
  score_belag: number;
  score_verhaeltnis: number;
  score_gesamt: number;
}

export const storeAnalysisSchema: ResponseFormatJSONSchema = {
  type: "json_schema",
  json_schema: {
    name: "StoreAnalysis",
    strict: true,
    description: "Eine Analyse eines Dönerladens mit Bewertungen",
    schema: {
      type: "object",
      properties: {
        bewertungstext: { type: "string", description: "Der Text der Bewertung" },
        score_geschmack: { type: "number", description: "Bewertung für den Geschmack", minimum: 0, maximum: 10 },
        score_belag: { type: "number", description: "Bewertung für den Belag", minimum: 0, maximum: 10 },
        score_verhaeltnis: {
          type: "number",
          description: "Bewertung für das Preis-Leistungs-Verhältnis",
          minimum: 0,
          maximum: 10,
        },
        score_gesamt: { type: "number", description: "Gesamtbewertung", minimum: 0, maximum: 100 },
      },
      required: ["bewertungstext", "score_geschmack", "score_belag", "score_verhaeltnis", "score_gesamt"],
      additionalProperties: false,
    },
  },
};
