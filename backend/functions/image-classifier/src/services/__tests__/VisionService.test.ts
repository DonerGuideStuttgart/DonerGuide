import { VisionService } from "../VisionService";
import createClient, { isUnexpected } from "@azure-rest/ai-vision-image-analysis";

// Mock the SDK
jest.mock("@azure-rest/ai-vision-image-analysis", () => ({
  __esModule: true,
  default: jest.fn(),
  isUnexpected: jest.fn(),
}));

jest.mock("@azure/identity");
jest.mock("@azure/core-auth");

describe("VisionService", () => {
  let visionService: VisionService;
  const mockPost = jest.fn();
  const mockPath = jest.fn();
  const mockContext = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup client mock
    mockPath.mockReturnValue({ post: mockPost });
    (createClient as jest.Mock).mockReturnValue({ path: mockPath });
    (isUnexpected as unknown as jest.Mock).mockReturnValue(false);
  });

  describe("Constructor", () => {
    it("should initialize in mock mode when no endpoint/key provided", () => {
      visionService = new VisionService({ enableMockMode: true });
      expect(visionService.getConfig().isMockMode).toBe(true);
    });

    it("should initialize client when endpoint provided", () => {
      visionService = new VisionService({
        endpoint: "https://test.cognitiveservices.azure.com",
        key: "test-key",
      });
      expect(createClient).toHaveBeenCalled();
    });
  });

  describe("analyzeImage", () => {
    const testHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const testBuffer = Buffer.concat([testHeader, Buffer.alloc(100)]); // Valid buffer

    it("should correct map 'food' tags", async () => {
      visionService = new VisionService({
        endpoint: "https://example.com",
        key: "key",
      });

      mockPost.mockResolvedValue({
        body: {
          tagsResult: {
            values: [
              { name: "food", confidence: 0.9 },
              { name: "plate", confidence: 0.8 },
            ],
          },
        },
      });

      const result = await visionService.analyzeImage(testBuffer, mockContext);
      expect(result.category).toBe("food");
      expect(result.confidence).toBe(0.9);
    });

    it("should correct map 'place' tags", async () => {
      visionService = new VisionService({
        endpoint: "https://example.com",
        key: "key",
      });

      mockPost.mockResolvedValue({
        body: {
          tagsResult: {
            values: [
              { name: "restaurant", confidence: 0.95 },
              { name: "indoor", confidence: 0.9 },
            ],
          },
        },
      });

      const result = await visionService.analyzeImage(testBuffer, mockContext);
      expect(result.category).toBe("place");
      expect(result.confidence).toBe(0.95);
    });

    it("should return 'discard' when no relevant tags found", async () => {
      visionService = new VisionService({
        endpoint: "https://example.com",
        key: "key",
      });

      mockPost.mockResolvedValue({
        body: {
          tagsResult: {
            values: [
              { name: "person", confidence: 0.9 },
              { name: "sky", confidence: 0.8 },
            ],
          },
        },
      });

      const result = await visionService.analyzeImage(testBuffer, mockContext);
      expect(result.category).toBe("discard");
    });

    it("should use mock analysis in mock mode", async () => {
      visionService = new VisionService({ enableMockMode: true });
      const result = await visionService.analyzeImage(testBuffer, mockContext);
      expect(result).toBeDefined();
      expect(createClient).not.toHaveBeenCalled();
    });

    it("should throw error when API returns unexpected response", async () => {
      visionService = new VisionService({
        endpoint: "https://example.com",
        key: "key",
      });

      (isUnexpected as unknown as jest.Mock).mockReturnValue(true);
      mockPost.mockResolvedValue({
        body: { error: { message: "API Error" } },
      });

      await expect(visionService.analyzeImage(testBuffer, mockContext)).rejects.toThrow("API Error");
    });
  });
});
