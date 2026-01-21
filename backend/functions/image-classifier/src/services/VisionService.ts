import createClient, { ImageAnalysisClient, isUnexpected } from "@azure-rest/ai-vision-image-analysis";
import { AzureKeyCredential } from "@azure/core-auth";
import { DefaultAzureCredential } from "@azure/identity";

export interface VisionAnalysisResult {
  category: "food" | "place" | "discard";
  confidence: number;
}

export interface VisionServiceConfig {
  endpoint: string;
  key?: string; // Optional now
  confidenceThreshold?: number;
  enableMockMode?: boolean;
}

const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;

// Define the expected shape of the API response
interface ImageAnalysisResult {
  tagsResult?: {
    values: { name: string; confidence: number }[];
  };
  objectsResult?: {
    values: { name: string; confidence: number }[];
  };
}

export class VisionService {
  // ... existing properties ...
  private client: ImageAnalysisClient | undefined;
  private isMockMode: boolean;
  private confidenceThreshold: number;
  private endpoint: string;

  constructor(config?: Partial<VisionServiceConfig>) {
    // ... (unchanged constructor)
    this.endpoint = config?.endpoint ?? process.env.IMAGE_CLASSIFIER_VISION_ENDPOINT ?? "";
    const key = config?.key ?? process.env.IMAGE_CLASSIFIER_VISION_KEY;
    this.isMockMode = config?.enableMockMode ?? (this.endpoint === "" && !key);
    this.confidenceThreshold = config?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;

    if (this.isMockMode && config?.enableMockMode !== true) {
      console.warn("VisionService: No endpoint found. Running in MOCK mode.");
    }

    if (!this.isMockMode) {
      if (!this.endpoint) {
        throw new Error("VisionService: Endpoint is required when not in mock mode.");
      }

      // Normalize endpoint
      if (!this.endpoint.startsWith("https://") && !this.endpoint.startsWith("http://")) {
        this.endpoint = `https://${this.endpoint}`;
      }

      const url = new URL(this.endpoint);
      this.endpoint = `${url.protocol}//${url.host}`;

      if (key) {
        this.client = createClient(this.endpoint, new AzureKeyCredential(key));
      } else {
        this.client = createClient(this.endpoint, new DefaultAzureCredential());
      }
    }
  }

  /**
   * Validates that the buffer contains valid image data
   */
  private validateImageBuffer(buffer: Buffer): void {
    if (buffer.length === 0) {
      throw new Error("Image buffer is empty or undefined");
    }
    if (buffer.length < 100) {
      throw new Error(`Image buffer too small (${String(buffer.length)} bytes)`);
    }
    // API limit is usually 4MB or 20MB depending on tier, keeping 10MB safety
    if (buffer.length > 20 * 1024 * 1024) {
      throw new Error(`Image buffer too large (${String(buffer.length)} bytes)`);
    }
  }

  public async analyzeImage(buffer: Buffer): Promise<VisionAnalysisResult> {
    this.validateImageBuffer(buffer);

    if (this.isMockMode || !this.client) {
      console.debug("VisionService: Using mock mode for image analysis");
      return this.getMockAnalysis();
    }

    try {
      const response = await this.client.path("/imageanalysis:analyze").post({
        body: buffer,
        queryParameters: {
          features: ["Tags", "Objects"],
          language: "en",
        },
        contentType: "application/octet-stream",
      });

      if (isUnexpected(response)) {
        throw new Error(response.body.error.message);
      }

      // Cast the body to our expected type since the SDK might return unknown/any
      return this.mapResponseToResult(response.body as ImageAnalysisResult);
    } catch (error: unknown) {
      const errorMessage = `Vision analysis failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error("VisionService:", errorMessage);
      throw new Error(errorMessage);
    }
  }

  private mapResponseToResult(result: ImageAnalysisResult): VisionAnalysisResult {
    // Check Tags
    const tags = result.tagsResult?.values ?? [];

    // Check Objects if tags are ambiguous
    // const objects = result.objectsResult?.values || [];

    // Sort tags by confidence
    tags.sort((a, b) => b.confidence - a.confidence);

    for (const tag of tags) {
      if (tag.confidence < this.confidenceThreshold) continue;

      const name = tag.name.toLowerCase();

      // Food detection
      if (
        name === "food" ||
        name === "dish" ||
        name === "cuisine" ||
        name === "meal" ||
        name === "breakfast" ||
        name === "lunch" ||
        name === "dinner" ||
        name === "snack" ||
        name === "dessert" ||
        name === "beverage" ||
        name === "drink" ||
        name.includes("bread") ||
        name.includes("meat") ||
        name.includes("vegetable") ||
        name.includes("fruit") ||
        name.includes("cake") ||
        name.includes("sandwich") ||
        name.includes("pizza") ||
        name.includes("burger")
      ) {
        return { category: "food", confidence: tag.confidence };
      }

      // Place detection
      if (
        name === "restaurant" ||
        name === "cafeteria" ||
        name === "dining room" ||
        name === "building" ||
        name === "architecture" ||
        name === "indoor" ||
        name === "outdoor" ||
        name === "house" ||
        name === "shop" ||
        name === "store" ||
        name === "facade" ||
        name === "street" ||
        name === "city"
      ) {
        return { category: "place", confidence: tag.confidence };
      }
    }

    return { category: "discard", confidence: 0 };
  }

  private getMockAnalysis(): VisionAnalysisResult {
    const random = Math.random();
    if (random > 0.6) {
      return { category: "food", confidence: 0.95 };
    } else if (random > 0.2) {
      return { category: "place", confidence: 0.85 };
    } else {
      return { category: "discard", confidence: 0.5 };
    }
  }

  public getConfig() {
    return {
      isMockMode: this.isMockMode,
      endpoint: this.isMockMode ? "mock" : this.endpoint,
    };
  }
}
