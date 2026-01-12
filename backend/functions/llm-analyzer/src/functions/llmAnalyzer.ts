import { CosmosClient, Item } from "@azure/cosmos";
import { app, InvocationContext } from "@azure/functions";
import { Place } from "doner_types";
import { AzureOpenAI } from "openai";
import { analyzeImage } from "../helper/analyzeImage";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { getImages } from "../helper/getImages";

const QUEUE_NAME_INPUT = process.env.LLM_ANALYZER_SERVICEBUS_QUEUE_NAME_INPUT ?? "classified-images";

const COSMOSDB_DATABASE_CONNECTION_STRING = process.env.LLM_ANALYZER_COSMOSDB_CONNECTION_STRING ?? "";
const COSMOSDB_DATABASE_NAME = process.env.LLM_ANALYZER_COSMOSDB_DATABASE_NAME ?? "DoenerGuideDB";
const COSMOSDB_CONTAINER_NAME = process.env.LLM_ANALYZER_COSMOSDB_CONTAINER_NAME ?? "Places";

const STORAGE_CONNECTION_STRING = process.env.LLM_ANALYZER_STORAGE_CONNECTION_STRING ?? "";
const STORAGE_CONTAINER_NAME = process.env.LLM_ANALYZER_STORAGE_CONTAINER_NAME ?? "photos";

const FOUNDRY_ENDPOINT = process.env.FOUNDRY_ENDPOINT ?? "";
const FOUNDRY_API_KEY = process.env.FOUNDRY_API_KEY ?? "";
const FOUNDRY_DEPLOYMENT_NAME = process.env.FOUNDRY_DEPLOYMENT_NAME ?? "gpt-5-mini";

const client = new CosmosClient(COSMOSDB_DATABASE_CONNECTION_STRING);

const aiClient = new AzureOpenAI({
  endpoint: FOUNDRY_ENDPOINT,
  apiVersion: "2025-04-01-preview",
  apiKey: FOUNDRY_API_KEY,
  deployment: FOUNDRY_DEPLOYMENT_NAME,
});

const containerClient: ContainerClient =
  BlobServiceClient.fromConnectionString(STORAGE_CONNECTION_STRING).getContainerClient(STORAGE_CONTAINER_NAME);

app.serviceBusQueue("llmAnalyzer", {
  connection: "LLM_ANALYZER_SERVICEBUS_CONNECTION_STRING",
  queueName: QUEUE_NAME_INPUT,
  handler: llmAnalyzer,
});

export async function llmAnalyzer(storeId: { storeId: string }, context: InvocationContext): Promise<void> {
  context.log("LLM Analyzer function ran at", new Date().toISOString());

  const database = (await client.databases.createIfNotExists({ id: COSMOSDB_DATABASE_NAME })).database;
  const container = (
    await database.containers.createIfNotExists({
      id: COSMOSDB_CONTAINER_NAME,
      partitionKey: { paths: ["/id"] },
    })
  ).container;

  const item: Item = container.item(storeId.storeId, storeId.storeId);

  context.log("Store ID found:", storeId);

  const { resource } = await item.read<Place>();
  const images = await getImages(context, containerClient, resource as Place);

  context.log("Images found:", images.length);

  const analysisResult = await analyzeImage(context, aiClient, images);

  const { resource } = await item.read<StoreData>();
  const imageUrl = resource?.image_URL;

  if (typeof imageUrl !== "string" || imageUrl.trim() === "") {
    context.error("No image URL found for store:", storeId);
    throw new Error("Image URL missing");
  }

  const analysisResult = await analyzeImage(imageUrl, context);

  await item.patch({
    operations: [
      {
        op: "set",
        path: "/ai_analysis",
        value: analysisResult,
      },
    ],
  });
}

async function analyzeImage(image_URL: string, context: InvocationContext): Promise<AnalysisResult> {
  try {
    const FOUNDRY_ENDPOINT = process.env.FOUNDRY_ENDPOINT ?? "";
    const FOUNDRY_API_KEY = process.env.FOUNDRY_API_KEY ?? "";
    const FOUNDRY_DEPLOYMENT_NAME = process.env.FOUNDRY_DEPLOYMENT_NAME ?? "gpt-5-mini";

    const response = await fetch(
      `${FOUNDRY_ENDPOINT}/openai/deployments/${FOUNDRY_DEPLOYMENT_NAME}/chat/completions?api-version=2024-02-15-preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": FOUNDRY_API_KEY,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `Du bist ein erfahrener, menschlicher Döner-Qualitätsbewerter mit jahrelanger Erfahrung in der Gastronomie.Deine Aufgabe ist es, Döner objektiv und konsistent zu bewerten.Schreibe den Bewertungstext als hättest du den Döner probiert.
              BEWERTUNGSKRITERIEN:
              1. GESCHMACK (1-10) - Visuelle Indikatoren für Geschmack:
                - Frische der Zutaten (knackiges Gemüse, saftiges Fleisch)
                - Appetitliche Farben und Kontraste
                - Erkennbare Röstaromen beim Fleisch (goldbraun, nicht verbrannt)
                - Ausgewogene Farbkomposition (nicht zu eintönig)
                - Soßenglanz und -konsistenz
                
              2. BELAG (1-10) - Qualität und Menge:
                - Großzügige Portionierung aller Komponenten
                - Sichtbare Vielfalt (Fleisch, Salat, Tomaten, Zwiebeln, Gurken, Rotkohl)
                - Frische und Qualität der einzelnen Zutaten
                - Keine welken oder verfärbten Komponenten
                
              3. VERHÄLTNIS (1-10) - Gleichmäßige Verteilung:
                - Ausgewogenes Verhältnis Fleisch:Gemüse:Soße (ca. 40:40:20)
                - Gleichmäßige Verteilung über die gesamte Länge des Döners
                - Keine "leeren" oder überladenen Stellen
                - Soße gut verteilt, nicht nur an einer Stelle
                - Fleisch nicht nur oben oder nur unten konzentriert
              4. GESAMT (1-100) - Gesamteindruck:
                - Zusammenspiel aller Faktoren
                - Optische Präsentation und Appetitlichkeit
                - Professionelle Zubereitung erkennbar
                - Würdest du diesen Döner kaufen wollen?
              BEWERTUNGSSKALA:
              - 90-100: Exzellent - Vorbildliche Qualität, kaum Verbesserungspotenzial
              - 70-89: Sehr gut - Hohe Qualität mit kleinen Optimierungsmöglichkeiten
              - 50-69: Gut - Solide Qualität, aber erkennbare Schwächen
              - 30-49: Ausreichend - Deutliche Mängel, unterhalb des Standards
              - 1-29: Mangelhaft - Schwerwiegende Qualitätsprobleme
              WICHTIG: 
              - Bewerte streng aber fair
              - Ein Score von 100 ist Perfektion und sehr selten
              - Berücksichtige alle verfügbaren Bilder für ein vollständiges Bild
              - Sei in deiner Begründung konkret und beschreibe, wie der Döner schmeckt`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Bitte bewerte den folgenden Döner:\n\nESSEN-BILDER:",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image_URL,
                  },
                },
                {
                  type: "text",
                  text: `Analysiere alle Bilder sorgfältig und erstelle eine strukturierte Bewertung.
                AUSGABEFORMAT - Antworte NUR mit folgendem JSON (keine zusätzlichen Texte):
                {
                  "bewertungstext": "Ein ausführlicher Bewertungstext mit 4-6 Sätzen, der die Stärken und Schwächen konkret beschreibt",
                  "score_geschmack": 0,
                  "score_belag": 0,
                  "score_verhaeltnis": 0,
                  "score_gesamt": 0
                }
                `,
                },
              ],
            },
          ],
          max_tokens: 500,
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Foundry API error: ${response.status.toString()} ${response.statusText} - ${errorText}`);
    }

    const result = (await response.json()) as FoundryResponse;
    const content = result.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from Foundry API");
    }

    const analysis = JSON.parse(content) as AnalysisResult;

    // Validate the response has all required fields
    if (
      typeof analysis.bewertungstext !== "string" ||
      typeof analysis.score_geschmack !== "number" ||
      typeof analysis.score_belag !== "number" ||
      typeof analysis.score_verhaeltnis !== "number" ||
      typeof analysis.score_gesamt !== "number"
    ) {
      throw new Error("Invalid analysis response format");
    }

    return {
      bewertungstext: analysis.bewertungstext,
      score_geschmack: analysis.score_geschmack,
      score_belag: analysis.score_belag,
      score_verhaeltnis: analysis.score_verhaeltnis,
      score_gesamt: analysis.score_gesamt,
    };
  } catch (error) {
    context.error("Error analyzing image:", error);
    throw error;
  }
}
