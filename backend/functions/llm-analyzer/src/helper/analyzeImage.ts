import { InvocationContext } from "@azure/functions";
import { AzureOpenAI } from "openai";
import { ParsedChatCompletion } from "openai/resources/chat/completions";
import { StoreAnalysis, storeAnalysisSchema } from "./doner_types";
import { getRandomPersona } from "./prompts";

export async function analyzeImage(
  context: InvocationContext,
  aiClient: AzureOpenAI,
  images: string[]
): Promise<StoreAnalysis> {
  const persona = getRandomPersona();
  context.log(`Verwende Persona: ${persona.name}`);

  const imagesBase64 = images.map((image) => ({
    type: "image_url" as const,
    image_url: {
      url: image,
      detail: "high" as const,
    },
  }));

  const response: ParsedChatCompletion<StoreAnalysis> = await aiClient.chat.completions.parse({
    messages: [
      { role: "system", content: persona.systemPrompt },
      {
        role: "user",
        content: [{ type: "text", text: persona.userPrompt }, ...imagesBase64],
      },
    ],
    max_completion_tokens: 2000,
    model: "gpt-4o",
    response_format: storeAnalysisSchema,
  });

  const result = response.choices[0].message.parsed;

  if (!result) {
    throw new Error("Keine Analyse vom Model erhalten");
  }

  return result;
}
