import type { Place, Photo } from "doner_types";
import { PaymentMethods } from "doner_types";
import { InvocationContext } from "@azure/functions";

export interface GooglePlaceResponse {
  places?: Record<string, unknown>[];
  nextPageToken?: string;
}

export interface GooglePlace {
  id: string;
  displayName?: { text: string; languageCode: string };
  internationalPhoneNumber?: string;
  location?: { latitude: number; longitude: number };
  addressComponents?: { longText: string; types: string[] }[];
  regularOpeningHours?: {
    periods: {
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }[];
  };
  photos?: { name: string }[];
  takeout?: boolean;
  delivery?: boolean;
  dineIn?: boolean;
  servesVegetarianFood?: boolean;
  paymentOptions?: {
    acceptsCashOnly?: boolean;
    acceptsCreditCards?: boolean;
    acceptsDebitCards?: boolean;
    acceptsNfc?: boolean;
  };
}

export class GoogleMapsService {
  private apiKey: string;
  private isDryRun: boolean;

  constructor(apiKey: string, isDryRun = false) {
    this.apiKey = apiKey;
    this.isDryRun = isDryRun;
  }

  async searchPlaces(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    context: InvocationContext,
    pageToken?: string
  ): Promise<GooglePlaceResponse> {
    if (this.isDryRun) {
      return this.getMockData(minLat, minLon, maxLat, maxLon, context, pageToken);
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
      "places.photos.name",
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
      throw new Error(`Google Places API error: ${String(response.status)} ${response.statusText} - ${errorText}`);
    }

    return (await response.json()) as GooglePlaceResponse;
  }

  async searchAllPages(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    context: InvocationContext
  ): Promise<Record<string, unknown>[]> {
    const allPlaces: Record<string, unknown>[] = [];
    let pageToken: string | undefined = undefined;
    let pageCount = 0;

    do {
      const response = await this.searchPlaces(minLat, minLon, maxLat, maxLon, context, pageToken);
      if (response.places) {
        allPlaces.push(...response.places);
      }
      pageToken = response.nextPageToken;
      pageCount++;
    } while (pageToken !== undefined && pageCount < 3);

    return allPlaces;
  }

  mapGooglePlaceToPlace(googlePlace: Record<string, unknown>): Place {
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
      id: id as string,
      name:
        typeof displayName === "object" && displayName !== null && "text" in displayName
          ? (displayName as { text: string }).text
          : "Unknown",
      doner_guide_version: 1,
      internationalPhoneNumber: internationalPhoneNumber as string | undefined,
      latitude:
        typeof location === "object" && location !== null && "latitude" in location
          ? (location as { latitude: number }).latitude
          : 0,
      longitude:
        typeof location === "object" && location !== null && "longitude" in location
          ? (location as { longitude: number }).longitude
          : 0,
      address: this.parseAddressComponents(addressComponents as Record<string, unknown>[] | undefined),
      openingHours: this.mapOpeningHours(regularOpeningHours as Record<string, unknown> | undefined),
      photos: this.mapPhotos(photos as Record<string, unknown>[] | undefined),
      paymentMethods: this.mapPaymentOptions(paymentOptions as Record<string, unknown> | undefined),
      takeout: takeout as boolean | undefined,
      delivery: delivery as boolean | undefined,
      dineIn: dineIn as boolean | undefined,
      servesVegetarianFood: servesVegetarianFood as boolean | undefined,
    };

    return place;
  }

  private parseAddressComponents(components?: Record<string, unknown>[]): Place["address"] {
    const address: Place["address"] = {};
    if (!components) return address;

    for (const component of components) {
      const types = Array.isArray(component.types) ? component.types : [];
      const longText = typeof component.longText === "string" ? component.longText : "";
      if (types.includes("postal_code")) {
        address.postalCode = longText;
      } else if (types.includes("locality")) {
        address.locality = longText;
      } else if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
        address.sublocality = longText;
      } else if (types.includes("route")) {
        address.streetAddress = longText;
      } else if (types.includes("street_number") && address.streetAddress !== undefined) {
        address.streetAddress = `${address.streetAddress} ${longText}`;
      }
    }
    return address;
  }

  private mapOpeningHours(googleHours: unknown): Place["openingHours"] {
    const openingHours: Place["openingHours"] = {};
    if (typeof googleHours !== "object" || googleHours === null) {
      return openingHours;
    }
    const hoursRecord = googleHours as Record<string, unknown>;
    if (!("periods" in hoursRecord) || !Array.isArray(hoursRecord.periods)) {
      return openingHours;
    }

    const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
    const periods = hoursRecord.periods as {
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }[];
    for (const period of periods) {
      const open = period.open;
      const close = period.close;

      const dayKey = days[open.day];
      const openMinutes = open.hour * 60 + open.minute;
      const closeMinutes = close
        ? close.day !== open.day
          ? 24 * 60 + close.hour * 60 + close.minute // Handle over-midnight
          : close.hour * 60 + close.minute
        : 24 * 60; // Default to midnight if no close time

      // Simple implementation: override with last period if multiple exist (interface limitation)
      openingHours[dayKey] = [openMinutes, closeMinutes];
    }

    return openingHours;
  }

  private mapPhotos(googlePhotos?: Record<string, unknown>[]): Photo[] {
    if (!googlePhotos) return [];
    return googlePhotos.slice(0, 10).map((photo) => ({
      id: photo.name as string, // Format is "places/PLACE_ID/photos/PHOTO_ID"
      url: `https://places.googleapis.com/v1/${String(photo.name)}/media?key=${this.apiKey}&maxHeightPx=1000`,
      mimeType: "unknown",
      category: "uncategorized",
      confidence: 0,
    }));
  }

  private mapPaymentOptions(paymentOptions?: Record<string, unknown>): PaymentMethods[] {
    const methods: PaymentMethods[] = [];
    if (!paymentOptions || typeof paymentOptions !== "object") return methods;

    if (paymentOptions.acceptsCashOnly === true) methods.push(PaymentMethods.CASH);
    if (paymentOptions.acceptsCreditCards === true) methods.push(PaymentMethods.CREDIT_CARD);
    if (paymentOptions.acceptsDebitCards === true) methods.push(PaymentMethods.DEBIT_CARD);
    if (paymentOptions.acceptsNfc === true) methods.push(PaymentMethods.NFC);

    return methods;
  }

  private getMockData(
    _minLat: number,
    _minLon: number,
    _maxLat: number,
    _maxLon: number,
    context: InvocationContext,
    pageToken?: string
  ): GooglePlaceResponse {
    if (pageToken === "end") return { places: [] };

    context.log(
      `[GoogleMapsService] MOCK: Searching in [${String(_minLat)}, ${String(_minLon)}] to [${String(_maxLat)}, ${String(_maxLon)}], pageToken: ${pageToken ?? ""}`
    );

    // Generate 5 mock places within the bounding box
    const places = Array.from({ length: 5 }).map((_, i) => {
      const lat = _minLat + Math.random() * (_maxLat - _minLat);
      const lon = _minLon + Math.random() * (_maxLon - _minLon);
      const id = `mock_place_${String(Date.now())}_${String(i)}`;
      return {
        id,
        displayName: { text: `Mock Doner ${String(i + 1)} (${pageToken ?? "p1"})`, languageCode: "de" },
        location: { latitude: lat, longitude: lon },
        internationalPhoneNumber: "+49 711 1234567",
        addressComponents: [
          { longText: "70173", types: ["postal_code"] },
          { longText: "Stuttgart", types: ["locality"] },
          { longText: "Mockstraße", types: ["route"] },
          { longText: String(i + 1), types: ["street_number"] },
        ],
        regularOpeningHours: {
          periods: [
            {
              open: { day: 1, hour: 10, minute: 0 },
              close: { day: 1, hour: 22, minute: 0 },
            },
          ],
        },
        paymentOptions: {
          acceptsCashOnly: true,
          acceptsCreditCards: Math.random() > 0.5,
        },
        takeout: true,
        delivery: Math.random() > 0.5,
        dineIn: true,
        photos: [
          {
            name: `places/${id}/photos/mock_p1`,
          },
        ],
      };
    });

    let nextPageToken: string | undefined = undefined;
    if (pageToken === undefined || pageToken === "") nextPageToken = "token_2";
    else if (pageToken === "token_2") nextPageToken = "end";

    return {
      places: places as unknown as Record<string, unknown>[],
      nextPageToken,
    };
  }
}
