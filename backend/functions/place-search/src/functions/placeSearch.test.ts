/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method */
jest.mock("@azure/cosmos", () => {
  return {
    CosmosClient: jest.fn().mockImplementation(() => ({
      databases: {
        createIfNotExists: jest.fn().mockResolvedValue({
          database: {
            containers: {
              createIfNotExists: jest.fn().mockResolvedValue({
                container: {
                  item: jest.fn().mockReturnValue({ read: jest.fn().mockResolvedValue({ resource: null }) }),
                  items: {
                    create: jest.fn().mockResolvedValue({}),
                    upsert: jest.fn().mockResolvedValue({}),
                  },
                },
              }),
            },
          },
        }),
      },
    })),
    PartitionKeyKind: { Hash: "Hash" },
    SpatialType: { Polygon: "Polygon" },
  };
});
jest.mock("../services/grid.service");
jest.mock("../services/google-maps.service");

import { InvocationContext, Timer } from "@azure/functions";
import { placeSearch } from "./placeSearch";
import { GridService } from "../services/grid.service";
import { GoogleMapsService } from "../services/google-maps.service";

describe("placeSearch function", () => {
  let context: InvocationContext;
  let timer: Timer;
  let mockGridService: jest.Mocked<GridService>;
  let mockGoogleMapsService: jest.Mocked<GoogleMapsService>;

  beforeEach(() => {
    context = {
      log: jest.fn(),
      error: jest.fn(),
      extraOutputs: {
        set: jest.fn(),
      },
    } as unknown as InvocationContext;
    timer = {} as Timer;

    mockGridService = new GridService({} as any) as jest.Mocked<GridService>;
    mockGoogleMapsService = new GoogleMapsService("key", true) as jest.Mocked<GoogleMapsService>;

    (GridService as jest.Mock).mockImplementation(() => mockGridService);
    (GoogleMapsService as jest.Mock).mockImplementation(() => mockGoogleMapsService);
  });

  it("should process a cell and log metrics", async () => {
    const mockCell = {
      id: "cell-1",
      level: 0,
      boundaryBox: { minLat: 48, minLon: 9, maxLat: 49, maxLon: 10 },
      gridVersion: "v1",
      status: "PENDING",
      lastProcessedAt: new Date().toISOString(),
    };

    mockGridService.getNextCell.mockResolvedValue(mockCell as any);
    mockGoogleMapsService.searchAllPages.mockResolvedValue([
      { id: "place-1", displayName: { text: "Place 1" } },
      { id: "place-2", displayName: { text: "Place 2" } },
    ]);
    mockGoogleMapsService.mapGooglePlaceToPlace.mockImplementation(
      (gp: any) =>
        ({
          id: gp.id,
          name: gp.displayName.text,
          photos: { uncategorized: [] },
        }) as any
    );

    await placeSearch(timer, context);

    expect(context.log).toHaveBeenCalledWith(expect.stringContaining("Results: 2 total, 2 new, 0 updated."));
    expect(context.log).toHaveBeenCalledWith(expect.stringContaining("Cell cell-1 search completed."));
    expect(mockGridService.markAsProcessing).toHaveBeenCalledWith(mockCell);
  });

  it("should handle 429 errors gracefully", async () => {
    const mockCell = {
      id: "cell-1",
      level: 0,
      boundaryBox: { minLat: 48, minLon: 9, maxLat: 49, maxLon: 10 },
      gridVersion: "v1",
      status: "PENDING",
    };

    mockGridService.getNextCell.mockResolvedValue(mockCell as any);
    mockGoogleMapsService.searchAllPages.mockRejectedValue(new Error("Google Places API error: 429 Too Many Requests"));

    await placeSearch(timer, context);

    expect(context.error).toHaveBeenCalledWith(
      expect.stringContaining("Error searching places for cell cell-1: Google Places API error: 429 Too Many Requests")
    );
    expect(context.log).toHaveBeenCalledWith(expect.stringContaining("Quota exceeded. Stopping search for this run."));
  });
});
