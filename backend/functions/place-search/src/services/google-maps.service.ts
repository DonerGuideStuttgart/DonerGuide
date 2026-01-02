import type { Place } from "doner_types";
import { PaymentMethods } from "doner_types";

export interface GooglePlaceResponse {
  places?: any[];
  nextPageToken?: string;
}

export class GoogleMapsService {
  private apiKey: string;
  private isDryRun: boolean;

  constructor(apiKey: string, isDryRun: boolean = false) {
    this.apiKey = apiKey;
    this.isDryRun = isDryRun;
  }

  async searchPlaces(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    pageToken?: string
  ): Promise<GooglePlaceResponse> {
    if (this.isDryRun) {
      return this.getMockData(minLat, minLon, maxLat, maxLon, pageToken);
    }

    const url = "https://places.googleapis.com/v1/places:searchText";
    const body = {
      textQuery: "Döner",
      locationRestriction: {
        rectangle: {
          low: { latitude: minLat, longitude: minLon },
          high: { latitude: maxLat, longitude: maxLon },
        },
      },
      pageToken: pageToken,
      languageCode: "de",
    };

    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.internationalPhoneNumber",
      "places.location",
      "places.regularOpeningHours",
      "places.addressComponents",
      "places.photos",
      "places.takeout",
      "places.delivery",
      "places.dineIn",
      "places.servesVegetarianFood",
      "places.paymentOptions",
      "nextPageToken",
    ].join(",");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Places API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return (await response.json()) as GooglePlaceResponse;
  }

  async searchAllPages(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number
  ): Promise<any[]> {
    const allPlaces: any[] = [];
    let pageToken: string | undefined = undefined;
    let pageCount = 0;

    do {
      const response = await this.searchPlaces(minLat, minLon, maxLat, maxLon, pageToken);
      if (response.places) {
        allPlaces.push(...response.places);
      }
      pageToken = response.nextPageToken;
      pageCount++;
    } while (pageToken && pageCount < 3);

    return allPlaces;
  }

  mapGooglePlaceToPlace(googlePlace: any): Place {
    const {
      id,
      displayName,
      internationalPhoneNumber,
      location,
      regularOpeningHours,
      addressComponents,
      photos,
      takeout,
      delivery,
      dineIn,
      servesVegetarianFood,
      paymentOptions,
    } = googlePlace;

    const place: Place = {
      id,
      name: displayName?.text || "Unknown",
      doner_guide_version: 1,
      internationalPhoneNumber,
      latitude: location?.latitude,
      longitude: location?.longitude,
      address: this.parseAddressComponents(addressComponents),
      openingHours: this.mapOpeningHours(regularOpeningHours),
      photos: {
        uncategorized: this.mapPhotos(photos, id),
        food: [],
        places: [],
      },
      paymentMethods: this.mapPaymentOptions(paymentOptions),
      takeout,
      delivery,
      dineIn,
      servesVegetarianFood,
    };

    return place;
  }

  private parseAddressComponents(components: any[]): Place["address"] {
    const address: Place["address"] = {};
    if (!components) return address;

    for (const component of components) {
      if (component.types.includes("postal_code")) {
        address.postalCode = component.longText;
      } else if (component.types.includes("locality")) {
        address.locality = component.longText;
      } else if (component.types.includes("sublocality") || component.types.includes("sublocality_level_1")) {
        address.sublocality = component.longText;
      } else if (component.types.includes("route")) {
        address.streetAddress = component.longText;
      } else if (component.types.includes("street_number")) {
        address.streetAddress = address.streetAddress 
          ? `${address.streetAddress} ${component.longText}` 
          : component.longText;
      }
    }
    return address;
  }

  private mapOpeningHours(googleHours: any): Place["openingHours"] {
    const openingHours: Place["openingHours"] = {};
    if (!googleHours?.periods) return openingHours;

    const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

    for (const period of googleHours.periods) {
      const open = period.open;
      const close = period.close;

      if (!open || !close) continue;

      const dayKey = days[open.day];
      const openMinutes = open.hour * 60 + open.minute;
      const closeMinutes = (close.day !== open.day) 
        ? (24 * 60 + close.hour * 60 + close.minute) // Handle over-midnight
        : (close.hour * 60 + close.minute);

      // Simple implementation: override with last period if multiple exist (interface limitation)
      openingHours[dayKey] = [openMinutes, closeMinutes];
    }

    return openingHours;
  }

  private mapPhotos(googlePhotos: any[], placeId: string): any[] {
    if (!googlePhotos) return [];
    return googlePhotos.slice(0, 10).map((photo) => ({
      id: photo.name, // Format is "places/PLACE_ID/photos/PHOTO_ID"
      photoUrl: `https://places.googleapis.com/v1/${photo.name}/media?key=${this.apiKey}&maxHeightPx=1000`,
    }));
  }

  private mapPaymentOptions(paymentOptions: any): PaymentMethods[] {
    const methods: PaymentMethods[] = [];
    if (!paymentOptions) return methods;

    if (paymentOptions.acceptsCashOnly) methods.push(PaymentMethods.CASH);
    if (paymentOptions.acceptsCreditCards) methods.push(PaymentMethods.CREDIT_CARD);
    if (paymentOptions.acceptsDebitCards) methods.push(PaymentMethods.DEBIT_CARD);
    if (paymentOptions.acceptsNfc) methods.push(PaymentMethods.NFC);

    return methods;
  }

  private getMockData(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    pageToken?: string
  ): GooglePlaceResponse {
    if (pageToken === "end") return { places: [] };

    // Generate 5 mock places within the bounding box
    const places = Array.from({ length: 5 }).map((_, i) => {
      const lat = minLat + Math.random() * (maxLat - minLat);
      const lon = minLon + Math.random() * (maxLon - minLon);
      const id = `mock_place_${Date.now()}_${i}`;
      return {
        id,
        displayName: { text: `Mock Doner ${i + 1}`, languageCode: "de" },
        location: { latitude: lat, longitude: lon },
        internationalPhoneNumber: "+49 711 1234567",
        addressComponents: [
          { longText: "70173", types: ["postal_code"] },
          { longText: "Stuttgart", types: ["locality"] },
          { longText: "Mockstraße", types: ["route"] },
          { longText: `${i + 1}`, types: ["street_number"] },
        ],
        regularOpeningHours: {
          periods: [
            {
              open: { day: 1, hour: 10, minute: 0 },
              close: { day: 1, hour: 22, minute: 0 },
            }
          ],
        },
        paymentOptions: {
          acceptsCashOnly: true,
          acceptsCreditCards: Math.random() > 0.5,
        },
        takeout: true,
        delivery: Math.random() > 0.5,
        dineIn: true,
      };
    });

    return { 
      places, 
      nextPageToken: pageToken ? "end" : "token_2" 
    };
  }
}
