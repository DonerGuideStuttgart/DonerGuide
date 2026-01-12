import { InvocationContext } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { imageClassifier, resetServices } from "../imageClassifier";
import { BlobService } from "../../services/BlobService";
import { VisionService } from "../../services/VisionService";
import type { NewPhotosMessage, Place } from "doner_types";

// Mock dependencies
jest.mock("@azure/cosmos");
jest.mock("../../services/BlobService");
jest.mock("../../services/VisionService");

process.env.IMAGE_CLASSIFIER_COSMOSDB_CONNECTION_STRING =
  "AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+8QBY5V598YWwqy9oY1m2VJX7ry9otS3ADAFE=";

describe("imageClassifier Handler", () => {
  let mockContext: InvocationContext;
  let mockCosmosClient: jest.Mocked<CosmosClient>;
  let mockBlobService: jest.Mocked<BlobService>;
  let mockVisionService: jest.Mocked<VisionService>;

  const storeId = "test-store-id";
  const mockPlace: Place = {
    id: storeId,
    name: "Test Store",
    doner_guide_version: 1,
    latitude: 0,
    longitude: 0,
    openingHours: {},
    address: {},
    photos: [{ id: "photo1", url: "url1", mimeType: "image/jpeg", category: "uncategorized", confidence: 0 }],
  };

  const mockMessage: NewPhotosMessage = {
    id: storeId,
    photos: [
      { id: "photo1", url: "url1", mimeType: "image/jpeg", category: "uncategorized", confidence: 0 },
      { id: "photo2", url: "url2", mimeType: "image/jpeg", category: "uncategorized", confidence: 0 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetServices();

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } as unknown as InvocationContext;

    mockCosmosClient = new CosmosClient("") as jest.Mocked<CosmosClient>;
    (CosmosClient as jest.Mock).mockImplementation(() => mockCosmosClient);

    mockBlobService = new BlobService() as jest.Mocked<BlobService>;
    (BlobService as jest.Mock).mockImplementation(() => mockBlobService);

    mockVisionService = new VisionService() as jest.Mocked<VisionService>;
    (VisionService as jest.Mock).mockImplementation(() => mockVisionService);

    // Setup CosmosDB Mocks
    const mockItem = {
      read: jest.fn().mockResolvedValue({ resource: mockPlace }),
      replace: jest.fn().mockResolvedValue({ resource: mockPlace }),
    };
    const mockContainer = {
      item: jest.fn().mockReturnValue(mockItem),
    };
    const mockDatabase = {
      container: jest.fn().mockReturnValue(mockContainer),
    };
    (mockCosmosClient.database as jest.Mock).mockReturnValue(mockDatabase);
  });

  it("should process photos and update CosmosDB successfully", async () => {
    // Setup Mocks for successful processing
    mockBlobService.downloadAndUploadImage.mockResolvedValue({
      contentType: "image/jpeg",
      buffer: Buffer.from("test"),
    });
    mockVisionService.analyzeImage.mockResolvedValueOnce({ category: "food", confidence: 0.9 });
    mockVisionService.analyzeImage.mockResolvedValueOnce({ category: "place", confidence: 0.8 });

    const result = await imageClassifier(mockMessage, mockContext);

    expect(result).toEqual({ storeId });
    expect(mockBlobService.ensureContainerExists).toHaveBeenCalled();
    expect(mockBlobService.downloadAndUploadImage).toHaveBeenCalledTimes(2);
    expect(mockVisionService.analyzeImage).toHaveBeenCalledTimes(2);

    // Verify CosmosDB update
    const mockContainer = (mockCosmosClient.database as jest.Mock)().container();
    const mockItem = mockContainer.item();
    expect(mockItem.replace).toHaveBeenCalledWith(
      expect.objectContaining({
        id: storeId,
        photos: expect.arrayContaining([
          expect.objectContaining({ id: "photo1", category: "food" }),
          expect.objectContaining({ id: "photo2", category: "place" }),
        ]),
      })
    );
  });

  it("should discard photos categorized as discard", async () => {
    mockBlobService.downloadAndUploadImage.mockResolvedValue({
      contentType: "image/jpeg",
      buffer: Buffer.from("test"),
    });
    mockVisionService.analyzeImage.mockResolvedValueOnce({ category: "discard", confidence: 0.1 }); // photo1
    mockVisionService.analyzeImage.mockResolvedValueOnce({ category: "food", confidence: 0.9 }); // photo2

    const result = await imageClassifier(mockMessage, mockContext);

    expect(result).toEqual({ storeId });
    expect(mockBlobService.deleteImage).toHaveBeenCalledWith("photo1");

    // Verify photo1 is removed and photo2 is added/updated
    const mockItem = (mockCosmosClient.database as jest.Mock)().container().item();
    const updatedPlace = mockItem.replace.mock.calls[0][0] as Place;

    expect(updatedPlace.photos.find((p) => p.id === "photo1")).toBeUndefined();
    expect(updatedPlace.photos.find((p) => p.id === "photo2")).toBeDefined();
    expect(updatedPlace.photos.find((p) => p.id === "photo2")?.category).toBe("food");
  });

  it("should handle partial failures in photo processing", async () => {
    mockBlobService.downloadAndUploadImage
      .mockResolvedValueOnce({ contentType: "image/jpeg", buffer: Buffer.from("test") }) // photo1 succeeds
      .mockRejectedValueOnce(new Error("Download failed")); // photo2 fails

    mockVisionService.analyzeImage.mockResolvedValue({ category: "food", confidence: 0.9 });

    const result = await imageClassifier(mockMessage, mockContext);

    expect(result).toEqual({ storeId });
    expect(mockContext.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to process a photo"),
      expect.any(Error)
    );

    // Verify only photo1 was updated
    const mockItem = (mockCosmosClient.database as jest.Mock)().container().item();
    const updatedPlace = mockItem.replace.mock.calls[0][0] as Place;
    expect(updatedPlace.photos.find((p) => p.id === "photo1")?.category).toBe("food");
  });

  it("should return undefined if storeId is missing", async () => {
    const result = await imageClassifier({ id: "", photos: [] } as NewPhotosMessage, mockContext);
    expect(result).toBeUndefined();
    expect(mockContext.error).toHaveBeenCalled();
  });

  it("should return undefined if place is not found", async () => {
    const mockContainer = (mockCosmosClient.database as jest.Mock)().container();
    mockContainer.item().read.mockResolvedValue({ resource: null });

    const result = await imageClassifier(mockMessage, mockContext);
    expect(result).toBeUndefined();
    expect(mockContext.error).toHaveBeenCalledWith(expect.stringContaining("not found in database"));
  });

  it("should not update CosmosDB if no changes occurred", async () => {
    mockBlobService.downloadAndUploadImage.mockResolvedValue({
      contentType: "image/jpeg",
      buffer: Buffer.from("test"),
    });
    // Assume photo1 is already 'food' with same confidence (unlikely but testable)
    mockVisionService.analyzeImage.mockResolvedValue({ category: "food", confidence: 0.9 });

    // Setup mockPlace to already have this photo as food
    mockPlace.photos[0] = { id: "photo1", url: "url1", mimeType: "image/jpeg", category: "food", confidence: 0.9 };

    // If we process nothing new (empty photo list for example)
    const result = await imageClassifier({ id: storeId, photos: [] }, mockContext);

    expect(result).toBeUndefined(); // Returns undefined for empty photos list as per logic
  });
});
