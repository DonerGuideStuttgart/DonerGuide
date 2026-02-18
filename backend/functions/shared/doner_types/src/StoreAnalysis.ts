import { ResponseFormatJSONSchema } from "openai/resources/shared";

export interface StoreAnalysis {
  bewertungstext: string;
  score_geschmack: number;
  score_belag: number;
  score_fleischanteil: number;
  score_soßenanteil: number;
  score_gesamt: number;
}

export const storeAnalysisSchema: ResponseFormatJSONSchema = {
  type: "json_schema",
  json_schema: {
    name: "StoreAnalysis",
    strict: true,
    description: "Eine Analyse eines Döners mit Bewertungen",
    schema: {
      type: "object",
      properties: {
        bewertungstext: {
          type: "string",
          description: "Der Text der Bewertung",
        },
        score_geschmack: {
          type: "number",
          description: "Bewertung für den Geschmack (1-10)",
          minimum: 1,
          maximum: 10,
        },
        score_belag: {
          type: "number",
          description: "Bewertung für den Belag (1-10)",
          minimum: 1,
          maximum: 10,
        },
        score_fleischanteil: {
          type: "number",
          description: "Bewertung für den Fleischanteil (1-10)",
          minimum: 1,
          maximum: 10,
        },
        score_soßenanteil: {
          type: "number",
          description: "Bewertung für den Soßenanteil (1-10)",
          minimum: 1,
          maximum: 10,
        },
        score_gesamt: {
          type: "number",
          description: "Gesamtbewertung (1-100)",
          minimum: 1,
          maximum: 100,
        },
      },
      required: [
        "bewertungstext",
        "score_geschmack",
        "score_belag",
        "score_fleischanteil",
        "score_soßenanteil",
        "score_gesamt",
      ],
      additionalProperties: false,
    },
  },
};
