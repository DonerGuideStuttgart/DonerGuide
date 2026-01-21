import { InvocationContext } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { imageClassifier, resetServices } from "../imageClassifier";
import { BlobService } from "../../services/BlobService";
import { VisionService } from "../../services/VisionService";
import type { PhotoClassificationMessage, Place } from "doner_types";

// Mock dependencies
jest.mock("@azure/cosmos");
jest.mock("../../services/BlobService");
jest.mock("../../services/VisionService");

process.env.IMAGE_CLASSIFIER_COSMOSDB_CONNECTION_STRING =
  "AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+8QBY5V598YWwqy9oY1m2VJX7ry9otS3ADAFE=";
process.env.IMAGE_CLASSIFIER_COSMOSDB_ENDPOINT = "https://localhost:8081/";
process.env.IMAGE_CLASSIFIER_STORAGE_ENDPOINT = "https://localhost:10000/";

describe("imageClassifier Handler", () => {
  let mockContext: InvocationContext;
  let mockCosmosClient: jest.Mocked<CosmosClient>;
  let mockBlobService: jest.Mocked<BlobService>;
  let mockVisionService: jest.Mocked<VisionService>;

  const storeId = "test-store-id";
  const photoId = "photo1";
  const url = "url1";

  let mockPlace: Place;
  const mockMessage: PhotoClassificationMessage = {
    storeId,
    photoId,
    url,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetServices();

    // Reset mockPlace data
    mockPlace = {
      id: storeId,
      name: "Test Store",
      doner_guide_version: 1,
      latitude: 0,
      longitude: 0,
      openingHours: {},
      address: {},
      photos: [{ id: photoId, url: url, mimeType: "image/jpeg", category: "uncategorized", confidence: 0 }],
    };

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
      read: jest.fn().mockImplementation(async () => ({ resource: JSON.parse(JSON.stringify(mockPlace)) })),
      replace: jest.fn().mockResolvedValue({ resource: mockPlace }),
    };
    const mockContainer = {
      item: jest.fn().mockReturnValue(mockItem),
      scripts: {
        storedProcedure: jest
          .fn()
          .mockReturnValue({ execute: jest.fn().mockResolvedValue({ resource: { isComplete: false } }) }),
      },
    };
    const mockDatabase = {
      container: jest.fn().mockReturnValue(mockContainer),
    };
    (mockCosmosClient.database as jest.Mock).mockReturnValue(mockDatabase);
  });

  it("should process a single photo and update CosmosDB successfully", async () => {
    // Setup Mocks for successful processing
    mockBlobService.downloadAndUploadImage.mockResolvedValue({
      contentType: "image/jpeg",
      buffer: Buffer.from("test"),
    });
    mockVisionService.analyzeImage.mockResolvedValue({ category: "food", confidence: 0.9 });

    // We are testing the fallback logic path (or SP path depending on env).
    // The handler uses SP by default unless disabled.
    process.env.IMAGE_CLASSIFIER_USE_SPROC = "false"; // Force client-side for unit test simplicity or mock SP

    const result = await imageClassifier(mockMessage, mockContext);

    expect(result).toEqual({ storeId }); // Expect storeId because single photo processing completes the store

    expect(mockBlobService.ensureContainerExists).toHaveBeenCalled();
    expect(mockBlobService.downloadAndUploadImage).toHaveBeenCalledWith(url, photoId);
    expect(mockVisionService.analyzeImage).toHaveBeenCalled();

    // Verify CosmosDB update (Client Side Fallback)
    const mockContainer = (mockCosmosClient.database as jest.Mock)().container();
    const mockItem = mockContainer.item();
    expect(mockItem.replace).toHaveBeenCalled();

    // Check arguments of replace
    const updatedPlace = mockItem.replace.mock.calls[0][0] as Place;
    const photo = updatedPlace.photos.find((p) => p.id === photoId);
    expect(photo?.category).toBe("food");
  });

  it("should discard photo categorized as discard", async () => {
    process.env.IMAGE_CLASSIFIER_USE_SPROC = "false";
    mockBlobService.downloadAndUploadImage.mockResolvedValue({
      contentType: "image/jpeg",
      buffer: Buffer.from("test"),
    });
    // Force return value
    mockVisionService.analyzeImage.mockResolvedValue({ category: "discard", confidence: 0.1 });

    await imageClassifier(mockMessage, mockContext);

    expect(mockBlobService.deleteImage).toHaveBeenCalledWith(photoId);

    const mockItem = (mockCosmosClient.database as jest.Mock)().container().item();
    const updatedPlace = mockItem.replace.mock.calls[0][0] as Place;
    expect(updatedPlace.photos.find((p) => p.id === photoId)).toBeUndefined();
  });

  it("should return storeId when all photos are processed", async () => {
    process.env.IMAGE_CLASSIFIER_USE_SPROC = "false";
    mockBlobService.downloadAndUploadImage.mockResolvedValue({
      contentType: "image/jpeg",
      buffer: Buffer.from("test"),
    });
    mockVisionService.analyzeImage.mockResolvedValue({ category: "food", confidence: 0.9 });

    // Mock that this was the last pending photo
    // The logic inside `patchPhotoClientSide` calculates `pendingCount`.
    // We need to setup mockPlace to have 0 uncategorized photos AFTER update.
    // Handled by modifying the mockPlace referenced by read()
    // But read() returns a deep copy? No, mocks return reference usually.
    // Actually, `patchPhotoClientSide` reads fresh place.
    // The mock returns `mockPlace`.

    // If we want `pendingCount === 0`, we ensure mockPlace has only this photo, and it gets updated.
    // mockPlace has 1 photo.

    const result = await imageClassifier(mockMessage, mockContext);
    expect(result).toEqual({ storeId });
  });

  it("should return undefined if input is invalid", async () => {
    const result = await imageClassifier({} as any, mockContext);
    expect(result).toBeUndefined();
    expect(mockContext.error).toHaveBeenCalled();
  });
});
