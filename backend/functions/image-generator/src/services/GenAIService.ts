import { GoogleGenAI } from "@google/genai";
import { GenerateContentResponse } from "@google/genai";
import { InvocationContext } from "@azure/functions";

export class GenAIService {
  private client: GoogleGenAI | undefined;
  private modelName: string;
  private isMockMode: boolean;

  constructor() {
    const apiKey = process.env.IMAGE_GENERATOR_GEMINI_API_KEY;
    this.modelName = process.env.IMAGE_GENERATOR_MODEL_NAME ?? "nano-banana";

    this.isMockMode = !apiKey || apiKey === "mock";

    if (this.isMockMode) {
      console.warn("GenAIService: No API key found or set to 'mock'. Running in MOCK mode.");
    } else {
      this.client = new GoogleGenAI({ apiKey: apiKey! });
    }
  }

  public async generateImage(prompt: string, context: InvocationContext): Promise<Buffer> {
    if (this.isMockMode || !this.client) {
      context.log(`[MOCK] Generating image for prompt: "${prompt}"`);
      return this.getMockImage();
    }

    try {
      const response: GenerateContentResponse = await this.client.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });

      for (const part of response.candidates?.[0].content?.parts ?? []) {
        if (part.text) {
          context.log(part.text);
        } else if (part.inlineData?.data) {
          return Buffer.from(part.inlineData.data, "base64");
        }
      }

      throw new Error("No image data found in response from GenAI");
    } catch (error) {
      context.error("GenAIService: Error generating image:", error);
      throw error;
    }
  }

  private getMockImage(): Buffer {
    // Return a 1x1 pixel PNG transparent buffer
    const base64Png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    return Buffer.from(base64Png, "base64");
  }
}
