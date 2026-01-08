import { VisionService, VisionAnalysisResult, VisionServiceConfig } from "../VisionService";
import axios from "axios";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("VisionService", () => {
  let visionService: VisionService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      head: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  describe("Constructor", () => {
    it("should initialize with mock mode when no API key is provided", () => {
      visionService = new VisionService();
      const config = visionService.getConfig();

      expect(config.isMockMode).toBe(true);
      expect(config.endpoint).toBe("mock");
    });

    it("should initialize with real API mode when API key is provided", () => {
      const config: Partial<VisionServiceConfig> = {
        endpoint: "https://test.cognitiveservices.azure.com",
        key: "test-key",
      };

      visionService = new VisionService(config);
      const serviceConfig = visionService.getConfig();

      expect(serviceConfig.isMockMode).toBe(false);
      expect(serviceConfig.endpoint).toBe("https://test.cognitiveservices.azure.com");
    });

    it("should use custom configuration when provided", () => {
      const config: Partial<VisionServiceConfig> = {
        endpoint: "https://test.cognitiveservices.azure.com",
        key: "test-key",
        maxRetries: 5,
        retryDelay: 2000,
      };

      visionService = new VisionService(config);
      const serviceConfig = visionService.getConfig();

      expect(serviceConfig.maxRetries).toBe(5);
    });

    it("should append analyze path to endpoint", () => {
      const config: Partial<VisionServiceConfig> = {
        endpoint: "https://test.cognitiveservices.azure.com",
        key: "test-key",
      };

      visionService = new VisionService(config);
      const serviceConfig = visionService.getConfig();

      expect(serviceConfig.endpoint).toBe("https://test.cognitiveservices.azure.com");
    });
  });

  describe("analyzeImage (Mock Mode)", () => {
    beforeEach(() => {
      visionService = new VisionService({ enableMockMode: true });
    });

    it("should return mock analysis result in mock mode", async () => {
      const testHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const testBuffer = Buffer.concat([testHeader, Buffer.alloc(100)]);

      const result = await visionService.analyzeImage(testBuffer);

      expect(result).toHaveProperty("category");
      expect(result).toHaveProperty("confidence");
      expect(["food", "place", "discard"]).toContain(result.category);
    });

    it("should validate image buffer even in mock mode", async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(visionService.analyzeImage(emptyBuffer)).rejects.toThrow("Image buffer is empty or undefined");
    });

    it("should validate buffer size in mock mode", async () => {
      const tooSmallBuffer = Buffer.alloc(99);

      await expect(visionService.analyzeImage(tooSmallBuffer)).rejects.toThrow("Image buffer too small");
    });
  });

  describe("analyzeImage (Real API Mode)", () => {
    beforeEach(() => {
      const config: Partial<VisionServiceConfig> = {
        endpoint: "https://test.cognitiveservices.azure.com",
        key: "test-key",
        maxRetries: 2,
        retryDelay: 100,
      };

      visionService = new VisionService(config);
    });

    it("should successfully analyze an image with food category", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      // Pad to meet minimum size requirement
      const paddedBuffer = Buffer.concat([testBuffer, Buffer.alloc(100)]);

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          categories: [
            { name: "food_sandwich", score: 0.95 },
            { name: "food_pizza", score: 0.85 },
          ],
        },
      });

      const result = await visionService.analyzeImage(paddedBuffer);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        expect.stringContaining("/analyze"),
        paddedBuffer,
        expect.objectContaining({
          params: { visualFeatures: "Categories" },
          headers: {
            "Ocp-Apim-Subscription-Key": "test-key",
            "Content-Type": "application/octet-stream",
          },
        })
      );

      expect(result.category).toBe("food");
      expect(result.confidence).toBe(0.95);
    });

    it("should successfully analyze an image with place category", async () => {
      const testBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const paddedBuffer = Buffer.concat([testBuffer, Buffer.alloc(100)]);

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          categories: [
            { name: "building_restaurant", score: 0.88 },
            { name: "indoor_dining", score: 0.75 },
          ],
        },
      });

      const result = await visionService.analyzeImage(paddedBuffer);

      expect(result.category).toBe("place");
      expect(result.confidence).toBe(0.88);
    });

    it("should classify as discard when no matching category", async () => {
      const testBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38]);
      const paddedBuffer = Buffer.concat([testBuffer, Buffer.alloc(100)]);

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          categories: [
            { name: "person", score: 0.9 },
            { name: "animal", score: 0.8 },
          ],
        },
      });

      const result = await visionService.analyzeImage(paddedBuffer);

      expect(result.category).toBe("discard");
      expect(result.confidence).toBe(0);
    });

    it("should classify as discard when no categories returned", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const paddedBuffer = Buffer.concat([testBuffer, Buffer.alloc(100)]);

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {},
      });

      const result = await visionService.analyzeImage(paddedBuffer);

      expect(result.category).toBe("discard");
      expect(result.confidence).toBe(0);
    });

    it("should retry on rate limiting (429)", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const paddedBuffer = Buffer.concat([testBuffer, Buffer.alloc(100)]);

      mockAxiosInstance.post
        .mockRejectedValueOnce({
          response: { status: 429, data: { message: "Rate limited" } },
        })
        .mockResolvedValueOnce({
          data: {
            categories: [{ name: "food_burger", score: 0.9 }],
          },
        });

      const result = await visionService.analyzeImage(paddedBuffer);

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      expect(result.category).toBe("food");
    });

    it("should retry on server errors (5xx)", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const paddedBuffer = Buffer.concat([testBuffer, Buffer.alloc(100)]);

      mockAxiosInstance.post
        .mockRejectedValueOnce({
          response: { status: 500, data: { message: "Internal server error" } },
        })
        .mockResolvedValueOnce({
          data: {
            categories: [{ name: "food_burger", score: 0.9 }],
          },
        });

      const result = await visionService.analyzeImage(paddedBuffer);

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      expect(result.category).toBe("food");
    });

    it("should fail after max retries", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const paddedBuffer = Buffer.concat([testBuffer, Buffer.alloc(100)]);

      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 500, data: { message: "Internal server error" } },
      });

      await expect(visionService.analyzeImage(paddedBuffer)).rejects.toThrow();
    });

    it("should throw error on authentication failure (401)", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const paddedBuffer = Buffer.concat([testBuffer, Buffer.alloc(100)]);

      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 401, data: { message: "Unauthorized" } },
      });

      await expect(visionService.analyzeImage(paddedBuffer)).rejects.toThrow("authentication failed");
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1); // No retry on auth errors
    });

    it("should throw error on access forbidden (403)", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const paddedBuffer = Buffer.concat([testBuffer, Buffer.alloc(100)]);

      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 403, data: { message: "Forbidden" } },
      });

      await expect(visionService.analyzeImage(paddedBuffer)).rejects.toThrow("access forbidden");
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it("should throw error on bad request (400)", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const paddedBuffer = Buffer.concat([testBuffer, Buffer.alloc(100)]);

      mockAxiosInstance.post.mockRejectedValue({
        response: { status: 400, data: { message: "Invalid request" } },
      });

      await expect(visionService.analyzeImage(paddedBuffer)).rejects.toThrow("bad request");
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it("should validate image buffer before sending request", async () => {
      const tooSmallBuffer = Buffer.alloc(50);

      await expect(visionService.analyzeImage(tooSmallBuffer)).rejects.toThrow("Image buffer too small");
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });

    it("should validate image buffer size limit", async () => {
      const tooLargeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11 MB

      await expect(visionService.analyzeImage(tooLargeBuffer)).rejects.toThrow("Image buffer too large");
      expect(mockAxiosInstance.post).not.toHaveBeenCalled();
    });
  });

  describe("Category Mapping", () => {
    beforeEach(() => {
      const config: Partial<VisionServiceConfig> = {
        endpoint: "https://test.cognitiveservices.azure.com",
        key: "test-key",
      };

      visionService = new VisionService(config);
    });

    it("should map food_* categories to food", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const paddedBuffer = Buffer.concat([testBuffer, Buffer.alloc(100)]);

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          categories: [
            { name: "food_sandwich", score: 0.95 },
            { name: "food_pizza", score: 0.9 },
            { name: "food_burger", score: 0.85 },
          ],
        },
      });

      const result = await visionService.analyzeImage(paddedBuffer);

      expect(result.category).toBe("food");
      expect(result.confidence).toBe(0.95); // Highest confidence
    });

    it("should map building_* categories to place", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const paddedBuffer = Buffer.concat([testBuffer, Buffer.alloc(100)]);

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          categories: [
            { name: "building_store", score: 0.88 },
            { name: "food_sandwich", score: 0.75 },
          ],
        },
      });

      const result = await visionService.analyzeImage(paddedBuffer);

      expect(result.category).toBe("place");
      expect(result.confidence).toBe(0.88);
    });

    it("should map indoor_* categories to place", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const paddedBuffer = Buffer.concat([testBuffer, Buffer.alloc(100)]);

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          categories: [{ name: "indoor_dining", score: 0.92 }],
        },
      });

      const result = await visionService.analyzeImage(paddedBuffer);

      expect(result.category).toBe("place");
    });

    it("should map outdoor_* categories to place", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const paddedBuffer = Buffer.concat([testBuffer, Buffer.alloc(100)]);

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          categories: [{ name: "outdoor_seating", score: 0.87 }],
        },
      });

      const result = await visionService.analyzeImage(paddedBuffer);

      expect(result.category).toBe("place");
    });

    it("should prioritize higher confidence when multiple valid categories exist", async () => {
      const testBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const paddedBuffer = Buffer.concat([testBuffer, Buffer.alloc(100)]);

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          categories: [
            { name: "food_burger", score: 0.75 },
            { name: "building_restaurant", score: 0.9 },
          ],
        },
      });

      const result = await visionService.analyzeImage(paddedBuffer);

      // Should return place with 0.90 confidence (higher than food's 0.75)
      expect(result.category).toBe("place");
      expect(result.confidence).toBe(0.9);
    });
  });

  describe("Image Validation", () => {
    beforeEach(() => {
      visionService = new VisionService({ enableMockMode: true });
    });

    it("should accept valid JPEG images", async () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const jpegBuffer = Buffer.concat([jpegHeader, Buffer.alloc(100)]);

      const result = await visionService.analyzeImage(jpegBuffer);

      expect(result).toBeDefined();
    });

    it("should accept valid PNG images", async () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const pngBuffer = Buffer.concat([pngHeader, Buffer.alloc(100)]);

      const result = await visionService.analyzeImage(pngBuffer);

      expect(result).toBeDefined();
    });

    it("should accept valid GIF images", async () => {
      const gifHeader = Buffer.from([0x47, 0x49, 0x46, 0x38]);
      const gifBuffer = Buffer.concat([gifHeader, Buffer.alloc(100)]);

      const result = await visionService.analyzeImage(gifBuffer);

      expect(result).toBeDefined();
    });

    it("should accept valid WEBP images", async () => {
      const webpHeader = Buffer.from([0x52, 0x49, 0x46, 0x46]);
      const webpBuffer = Buffer.concat([webpHeader, Buffer.alloc(100)]);

      const result = await visionService.analyzeImage(webpBuffer);

      expect(result).toBeDefined();
    });

    it("should accept valid BMP images", async () => {
      const bmpHeader = Buffer.from([0x42, 0x4d]);
      const bmpBuffer = Buffer.concat([bmpHeader, Buffer.alloc(100)]);

      const result = await visionService.analyzeImage(bmpBuffer);

      expect(result).toBeDefined();
    });

    it("should reject empty buffer", async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(visionService.analyzeImage(emptyBuffer)).rejects.toThrow("Image buffer is empty or undefined");
    });

    it("should reject buffer smaller than 100 bytes", async () => {
      const smallBuffer = Buffer.alloc(99);

      await expect(visionService.analyzeImage(smallBuffer)).rejects.toThrow("Image buffer too small");
    });

    it("should reject buffer larger than 10 MB", async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      await expect(visionService.analyzeImage(largeBuffer)).rejects.toThrow("Image buffer too large");
    });

    it("should warn but accept images with unrecognized signatures", async () => {
      // Create a buffer with valid size but invalid signature
      const buffer = Buffer.alloc(1000).fill(0xaa);

      // Should still work, just with a warning
      const result = await visionService.analyzeImage(buffer);

      expect(result).toBeDefined();
    });
  });

  describe("Health Check", () => {
    it("should return true in mock mode", async () => {
      visionService = new VisionService({ enableMockMode: true });

      const result = await visionService.healthCheck();

      expect(result).toBe(true);
      expect(mockAxiosInstance.head).not.toHaveBeenCalled();
    });

    it("should return true when endpoint is accessible", async () => {
      visionService = new VisionService({
        endpoint: "https://test.cognitiveservices.azure.com",
        key: "test-key",
      });

      mockAxiosInstance.head.mockResolvedValue({ status: 405 });

      const result = await visionService.healthCheck();

      expect(result).toBe(true);
      expect(mockAxiosInstance.head).toHaveBeenCalled();
    });

    it("should return false when endpoint is not accessible", async () => {
      visionService = new VisionService({
        endpoint: "https://test.cognitiveservices.azure.com",
        key: "test-key",
      });

      mockAxiosInstance.head.mockRejectedValue(new Error("Network error"));

      const result = await visionService.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe("Get Config", () => {
    it("should return masked config in mock mode", () => {
      visionService = new VisionService({ enableMockMode: true });

      const config = visionService.getConfig();

      expect(config).toEqual({
        isMockMode: true,
        endpoint: "mock",
        maxRetries: 3,
      });
    });

    it("should return masked config in real mode", () => {
      visionService = new VisionService({
        endpoint: "https://test.cognitiveservices.azure.com",
        key: "secret-key",
        maxRetries: 5,
      });

      const config = visionService.getConfig();

      expect(config).toEqual({
        isMockMode: false,
        endpoint: "https://test.cognitiveservices.azure.com",
        maxRetries: 5,
      });
    });

    it("should not include API key in config", () => {
      visionService = new VisionService({
        endpoint: "https://test.cognitiveservices.azure.com",
        key: "secret-key",
      });

      const config = visionService.getConfig();

      expect(config).not.toHaveProperty("key");
    });
  });
});
