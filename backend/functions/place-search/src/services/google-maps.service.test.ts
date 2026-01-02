import { GoogleMapsService } from "./google-maps.service";
import { PaymentMethods } from "doner_types";

describe("GoogleMapsService", () => {
  let service: GoogleMapsService;
  const apiKey = "test-api-key";

  beforeEach(() => {
    service = new GoogleMapsService(apiKey, false);
    // Reset global fetch mock
    global.fetch = jest.fn();
  });

  describe("searchPlaces", () => {
    it("should call Google API with correct parameters", async () => {
      const mockResponse = { places: [{ id: "123" }], nextPageToken: "token" };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.searchPlaces(48.0, 9.0, 49.0, 10.0);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://places.googleapis.com/v1/places:searchText",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": expect.stringContaining("places.id"),
          }),
          body: expect.stringContaining('"low":{"latitude":48,"longitude":9}'),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should thrown an error on non-ok response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: jest.fn().mockResolvedValue("API Key Invalid"),
      });

      await expect(service.searchPlaces(48.0, 9.0, 49.0, 10.0)).rejects.toThrow(
        "Google Places API error: 403 Forbidden - API Key Invalid"
      );
    });

    it("should return mock data in dry run mode", async () => {
      service = new GoogleMapsService(apiKey, true);
      const result = await service.searchPlaces(48.0, 9.0, 49.0, 10.0);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.places).toHaveLength(5);
      expect(result.nextPageToken).toBe("token_2");
    });

    it("should fetch up to 3 pages in searchAllPages", async () => {
      // Mock global fetch
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ places: [{ id: "p1" }], nextPageToken: "token2" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ places: [{ id: "p2" }], nextPageToken: "token3" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ places: [{ id: "p3" }], nextPageToken: "token4" }),
        });
      global.fetch = mockFetch;

      const results = await service.searchAllPages(48.0, 9.0, 49.0, 10.0);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(3);
      expect(results[0].id).toBe("p1");
      expect(results[1].id).toBe("p2");
      expect(results[2].id).toBe("p3");
    });
  });

  describe("mapGooglePlaceToPlace", () => {
    it("should correctly map a complex Google Place object", () => {
      const googlePlace = {
        id: "ch_123",
        displayName: { text: "Best Doner", languageCode: "de" },
        location: { latitude: 48.7, longitude: 9.1 },
        internationalPhoneNumber: "+49 711 000000",
        addressComponents: [
          { longText: "70173", types: ["postal_code"] },
          { longText: "Stuttgart", types: ["locality"] },
          { longText: "Hauptstraße", types: ["route"] },
          { longText: "42", types: ["street_number"] },
        ],
        regularOpeningHours: {
          periods: [
            {
              open: { day: 1, hour: 10, minute: 30 },
              close: { day: 1, hour: 22, minute: 0 },
            },
          ],
        },
        paymentOptions: {
          acceptsCashOnly: false,
          acceptsCreditCards: true,
          acceptsNfc: true,
        },
        takeout: true,
        delivery: false,
        dineIn: true,
        servesVegetarianFood: true,
        photos: [
          { 
            name: "places/ch_123/photos/p1",
            widthPx: 1200,
            heightPx: 800,
            authorAttributions: [
              {
                displayName: "John Doe",
                uri: "https://example.com/john",
                photoUri: "https://example.com/john.jpg",
              }
            ]
          },
          { name: "places/ch_123/photos/p2" },
        ],
      };

      const place = service.mapGooglePlaceToPlace(googlePlace);

      expect(place.id).toBe("ch_123");
      expect(place.name).toBe("Best Doner");
      expect(place.latitude).toBe(48.7);
      expect(place.longitude).toBe(9.1);
      expect(place.address.postalCode).toBe("70173");
      expect(place.address.streetAddress).toBe("Hauptstraße 42");
      expect(place.openingHours.Mo).toEqual([630, 1320]);
      expect(place.paymentMethods).toContain(PaymentMethods.CREDIT_CARD);
      expect(place.paymentMethods).toContain(PaymentMethods.NFC);
      expect(place.photos.uncategorized).toHaveLength(2);
      expect(place.photos.uncategorized?.[0].id).toBe("places/ch_123/photos/p1");
      expect(place.photos.uncategorized?.[0].widthPx).toBe(1200);
      expect(place.photos.uncategorized?.[0].heightPx).toBe(800);
      expect(place.photos.uncategorized?.[0].authorAttributions?.[0].displayName).toBe("John Doe");
      expect(place.takeout).toBe(true);
      expect(place.delivery).toBe(false);
    });

    it("should handle missing optional fields", () => {
      const googlePlace = { id: "minimal" };
      const place = service.mapGooglePlaceToPlace(googlePlace);
      expect(place.name).toBe("Unknown");
      expect(place.address).toEqual({});
      expect(place.paymentMethods).toEqual([]);
    });

    it("should handle over-midnight opening hours", () => {
      const googlePlace = {
        regularOpeningHours: {
          periods: [
            {
              open: { day: 1, hour: 18, minute: 0 },
              close: { day: 2, hour: 2, minute: 30 },
            },
          ],
        },
      };

      const place = service.mapGooglePlaceToPlace(googlePlace);
      expect(place.openingHours.Mo).toEqual([1080, 1590]); // 18:00=1080, 26:30=1590
    });
  });
});
