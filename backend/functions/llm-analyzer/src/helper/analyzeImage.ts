import { InvocationContext } from "@azure/functions";
import { StoreAnalysis, storeAnalysisSchema } from "doner_types";
import { ParsedResponse } from "openai/resources/responses/responses";
import { systemPrompt, userPrompt } from "./prompts";
import { AzureOpenAI } from "openai";
import { ParsedChatCompletion } from "openai/resources/chat/completions";

export async function analyzeImage(
    context: InvocationContext,
    aiClient: AzureOpenAI,
    images: string[]
): Promise<StoreAnalysis> {

  const imagesBase64 = images.map(image => {
    return {
      type: "image_url",
      detail: "auto",
      image_url: {
        url: image
      }
    } as const
  })

  const response: ParsedChatCompletion<StoreAnalysis> = await aiClient.chat.completions.parse({
      messages: [
        {role: "system", content: systemPrompt},
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Bitte bewerte den folgenden Döner:\n\nESSEN-BILDER:",
            },
            ...imagesBase64,
            {
              type: "text",
              text: userPrompt,
            }
          ]
        }
      ],
      max_completion_tokens: 2000,
      model: "gpt-5-mini",
      response_format: storeAnalysisSchema
    })

    const result = response.choices[0].message.parsed;
    return result as StoreAnalysis;
}
