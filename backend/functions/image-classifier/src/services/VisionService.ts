import axios, { AxiosInstance } from "axios";

export interface VisionAnalysisResult {
  category: "food" | "place" | "discard";
  confidence: number;
}

export interface VisionServiceConfig {
  endpoint: string;
  key: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableMockMode?: boolean;
}

interface AzureVisionCategory {
  name: string;
  score: number;
}

interface AzureVisionResponse {
  categories?: AzureVisionCategory[];
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

export class VisionService {
  private endpoint: string;
  private key: string;
  private isMockMode: boolean;
  private axiosInstance: AxiosInstance;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config?: Partial<VisionServiceConfig>) {
    this.endpoint = config?.endpoint ?? process.env.IMAGE_CLASSIFIER_VISION_ENDPOINT ?? "";
    this.key = config?.key ?? process.env.IMAGE_CLASSIFIER_VISION_KEY ?? "";
    this.isMockMode = config?.enableMockMode ?? this.key === "";
    this.maxRetries = config?.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelay = config?.retryDelay ?? DEFAULT_RETRY_DELAY;

    if (this.isMockMode && config?.enableMockMode !== true) {
      console.warn("VisionService: No API key found. Running in MOCK mode.");
    }

    // Initialize axios instance with timeout and interceptors
    this.axiosInstance = axios.create({
      timeout: config?.timeout ?? DEFAULT_TIMEOUT,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    this.setupAxiosInterceptors();

    if (!this.isMockMode) {
      // Ensure endpoint doesn't have a trailing slash and ends with the analyze path
      if (!this.endpoint.endsWith("/analyze")) {
        this.endpoint = this.endpoint.replace(/\/$/, "") + "/vision/v3.2/analyze";
      }
    }
  }

  /**
   * Sets up axios interceptors for logging and error handling
   */
  private setupAxiosInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.debug("VisionService: Making request to Azure Vision API", {
          url: config.url,
          method: config.method,
          timeout: config.timeout,
        });
        return config;
      },
      (error: unknown) => {
        console.error("VisionService: Request error:", error);
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.debug("VisionService: Received response from Azure Vision API", {
          status: response.status,
          dataLength: JSON.stringify(response.data).length,
        });
        return response;
      },
      (error: unknown) => {
        if (typeof error === "object" && error !== null && "response" in error) {
          const err = error as { response?: { status: number; data: unknown } };
          if (err.response) {
            console.error("VisionService: API response error:", {
              status: err.response.status,
              data: err.response.data,
            });
          }
        }
        return Promise.reject(error instanceof Error ? error : new Error(String(error)));
      }
    );
  }

  /**
   * Validates that the buffer contains valid image data
   * @param buffer The image buffer to validate
   * @throws Error if the buffer is invalid
   */
  private validateImageBuffer(buffer: Buffer): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!buffer || buffer.length === 0) {
      throw new Error("Image buffer is empty or undefined");
    }

    // Minimum reasonable image size (100 bytes)
    if (buffer.length < 100) {
      throw new Error(`Image buffer too small (${String(buffer.length)} bytes)`);
    }

    // Maximum reasonable image size (10 MB)
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error(`Image buffer too large (${String(buffer.length)} bytes)`);
    }

    // Check for common image signatures (magic numbers)
    const signature = buffer.subarray(0, 4);
    const validSignatures = [
      Buffer.from([0xff, 0xd8, 0xff]), // JPEG
      Buffer.from([0x89, 0x50, 0x4e, 0x47]), // PNG
      Buffer.from([0x47, 0x49, 0x46]), // GIF
      Buffer.from([0x52, 0x49, 0x46, 0x46]), // WEBP
      Buffer.from([0x42, 0x4d]), // BMP
    ];

    const isValid = validSignatures.some((sig) => signature.subarray(0, sig.length).equals(sig));
    if (!isValid) {
      console.warn("VisionService: Image buffer does not have a recognized image signature");
    }
  }

  /**
   * Implements retry logic with exponential backoff
   * @param operation The async operation to retry
   * @returns The result of the operation
   */
  private async retryWithBackoff<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors
        if (typeof error === "object" && error !== null && "response" in error) {
          const err = error as { response?: { status: number; data?: { message?: string } } };
          if (err.response?.status === 401) {
            throw new Error("Azure Vision API authentication failed. Check your API key.");
          }
          if (err.response?.status === 403) {
            throw new Error("Azure Vision API access forbidden. Check your permissions.");
          }
          if (err.response?.status === 400) {
            throw new Error(`Azure Vision API bad request: ${err.response.data?.message ?? lastError.message}`);
          }

          // Retry on rate limiting (429) and server errors (5xx)
          const isRetryable =
            err.response === undefined ||
            err.response.status === 429 ||
            (err.response.status >= 500 && err.response.status < 600);

          if (!isRetryable || attempt === this.maxRetries) {
            throw error;
          }

          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.warn(
            `VisionService: Attempt ${String(attempt)} failed, retrying in ${String(delay)}ms...`,
            lastError.message
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError ?? new Error("Unknown error during retry");
  }

  /**
   * Sleep utility for delays
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validates the Azure Vision API response
   * @param response The response data to validate
   * @throws Error if the response is invalid
   */
  private validateResponse(response: unknown): AzureVisionResponse {
    if (typeof response !== "object" || response === null) {
      throw new Error("Invalid response: response is not an object");
    }

    const resp = response as Record<string, unknown>;
    if (!Array.isArray(resp.categories)) {
      console.warn("VisionService: Response does not contain categories array, using empty array");
      return { categories: [] };
    }

    return response as AzureVisionResponse;
  }

  /**
   * Analyzes an image using Azure AI Vision v3.2.
   * @param buffer The image data.
   * @returns The classification result and confidence.
   * @throws Error if analysis fails after all retries
   */
  public async analyzeImage(buffer: Buffer): Promise<VisionAnalysisResult> {
    // Validate input (always validate, even in mock mode)
    this.validateImageBuffer(buffer);

    if (this.isMockMode) {
      console.debug("VisionService: Using mock mode for image analysis");
      return this.getMockAnalysis();
    }

    try {
      const result = await this.retryWithBackoff(async () => {
        const response = await this.axiosInstance.post(this.endpoint, buffer, {
          params: {
            visualFeatures: "Categories",
          },
          headers: {
            "Ocp-Apim-Subscription-Key": this.key,
            "Content-Type": "application/octet-stream",
          },
        });

        const validatedResponse = this.validateResponse(response.data);
        return this.mapCategoriesToResult(validatedResponse.categories ?? []);
      });

      console.info("VisionService: Image analysis completed successfully", {
        category: result.category,
        confidence: result.confidence,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage = `Vision analysis failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error("VisionService:", errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Maps Azure Vision categories to our classification scheme
   * @param categories Array of Azure Vision categories
   * @returns The mapped classification result
   */
  private mapCategoriesToResult(categories: AzureVisionCategory[]): VisionAnalysisResult {
    if (categories.length === 0) {
      console.debug("VisionService: No categories returned, classifying as discard");
      return { category: "discard", confidence: 0 };
    }

    // Sort by confidence (score) to get the best match
    const sorted = [...categories].sort((a, b) => b.score - a.score);

    for (const cat of sorted) {
      const name = cat.name.toLowerCase();
      const confidence = cat.score;

      // Food classification
      if (name.startsWith("food_")) {
        console.debug(`VisionService: Classified as food (${name}) with confidence ${String(confidence)}`);
        return { category: "food", confidence };
      }

      // Place classification
      if (name.startsWith("building_") || name.startsWith("indoor_") || name.startsWith("outdoor_")) {
        console.debug(`VisionService: Classified as place (${name}) with confidence ${String(confidence)}`);
        return { category: "place", confidence };
      }
    }

    console.debug("VisionService: No matching category found, classifying as discard");
    return { category: "discard", confidence: 0 };
  }

  /**
   * Generates mock analysis results for development/testing
   * This allows development without an Azure Vision API key
   * @returns A mock classification result
   */
  private getMockAnalysis(): VisionAnalysisResult {
    const random = Math.random();

    if (random > 0.6) {
      console.debug("VisionService: Mock analysis - food");
      return { category: "food", confidence: 0.95 };
    } else if (random > 0.2) {
      console.debug("VisionService: Mock analysis - place");
      return { category: "place", confidence: 0.85 };
    } else {
      console.debug("VisionService: Mock analysis - discard");
      return { category: "discard", confidence: 0.5 };
    }
  }

  /**
   * Health check for the VisionService
   * @returns Promise that resolves if the service is healthy
   */
  public async healthCheck(): Promise<boolean> {
    if (this.isMockMode) {
      return true;
    }

    try {
      // Try to validate endpoint accessibility with a minimal request
      await this.axiosInstance.head(this.endpoint, {
        headers: {
          "Ocp-Apim-Subscription-Key": this.key,
        },
        validateStatus: (status) => status === 405 || status < 500, // Accept 405 Method Not Allowed for HEAD requests
      });
      return true;
    } catch (error: unknown) {
      console.error("VisionService: Health check failed", error);
      return false;
    }
  }

  /**
   * Gets the current configuration of the VisionService
   * @returns The current configuration (with sensitive data masked)
   */
  public getConfig(): { isMockMode: boolean; endpoint: string; maxRetries: number } {
    return {
      isMockMode: this.isMockMode,
      endpoint: this.isMockMode ? "mock" : this.endpoint.replace(/\/vision\/v3\.2\/analyze$/, ""),
      maxRetries: this.maxRetries,
    };
  }
}
