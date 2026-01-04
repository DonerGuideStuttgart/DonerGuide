/**
 * Mapper service to convert Google Places API responses to internal Place type
 */

import type { Place } from "doner_types";
import { PaymentMethods } from "doner_types";
import type { GooglePlace, OpeningPeriod } from "../types/googlePlaces.types";
import type { PlaceSearchResult } from "../types/placeSearchResult.types";

/**
 * Converts a Google Place to internal PlaceSearchResult type
 *
 * @param googlePlace - Google Places API response
 * @param foundViaQuery - Query that found this place (e.g., "Döner")
 * @returns PlaceSearchResult object with foundViaQueries initialized
 */
export function googlePlaceToPlace(googlePlace: GooglePlace, foundViaQuery: string): PlaceSearchResult {
  return {
    id: googlePlace.id,
    name: googlePlace.displayName?.text ?? "Unknown",
    doner_guide_version: 1,
    internationalPhoneNumber: googlePlace.internationalPhoneNumber,
    latitude: googlePlace.location?.latitude ?? 0,
    longitude: googlePlace.location?.longitude ?? 0,
    openingHours: convertOpeningHours(googlePlace.regularOpeningHours?.periods),
    address: parseAddress(googlePlace),
    photos: {
      uncategorized: convertPhotos(googlePlace.photos),
      food: [],
      places: [],
    },
    paymentMethods: convertPaymentOptions(googlePlace.paymentOptions),
    takeout: googlePlace.takeout,
    delivery: googlePlace.delivery,
    dineIn: googlePlace.dineIn,
    servesVegetarianFood: googlePlace.servesVegetarianFood,
    foundViaQueries: [foundViaQuery], // Initialize with single query that found this place
  };
}

/**
 * Converts Google's opening periods to internal format
 * Internal format: { Mo: [[openMinutes, closeMinutes], ...], ... }
 * Handles multiple opening periods per day (e.g., lunch and dinner)
 */
function convertOpeningHours(periods?: OpeningPeriod[]): Place["openingHours"] {
  if (!periods || periods.length === 0) {
    return {};
  }

  const dayMap: Record<number, keyof Place["openingHours"]> = {
    0: "Su",
    1: "Mo",
    2: "Tu",
    3: "We",
    4: "Th",
    5: "Fr",
    6: "Sa",
  };

  const result: Place["openingHours"] = {};

  for (const period of periods) {
    // dayMap covers all valid days (0-6), so dayKey is always defined
    const dayKey = dayMap[period.open.day];

    const openMinutes = period.open.hour * 60 + period.open.minute;
    const closeMinutes = period.close ? period.close.hour * 60 + period.close.minute : 24 * 60; // Default to midnight if no close time

    // Initialize array if empty
    result[dayKey] ??= [];

    // Add period to array
    result[dayKey].push([openMinutes, closeMinutes]);
  }

  // Sort periods for each day by opening time to ensure correct order
  for (const day of Object.values(dayMap)) {
    if (result[day]) {
      result[day].sort((a, b) => a[0] - b[0]);
    }
  }

  return result;
}

/**
 * Parses address from Google Place using addressComponents or formattedAddress
 */
function parseAddress(googlePlace: GooglePlace): Place["address"] {
  const address: Place["address"] = {};

  if (googlePlace.addressComponents) {
    for (const component of googlePlace.addressComponents) {
      // Skip components without types property
      if (!component.types) continue;

      if (component.types.includes("postal_code")) {
        address.postalCode = component.longText;
      }
      if (component.types.includes("locality")) {
        address.locality = component.longText;
      }
      if (component.types.includes("sublocality") || component.types.includes("sublocality_level_1")) {
        address.sublocality = component.longText;
      }
      if (component.types.includes("route")) {
        const streetNumber = googlePlace.addressComponents.find((c) => c.types?.includes("street_number") === true);
        address.streetAddress = streetNumber ? `${component.longText} ${streetNumber.longText}` : component.longText;
      }
    }
  }

  // Fallback to formatted address if no street address found
  if (
    (address.streetAddress === undefined || address.streetAddress === "") &&
    googlePlace.formattedAddress !== undefined &&
    googlePlace.formattedAddress !== ""
  ) {
    address.streetAddress = googlePlace.formattedAddress;
  }

  return address;
}

/**
 * Converts Google photo references to internal Photo format
 *
 * IMPORTANT: Only stores the photo reference, NOT the full URL with API key.
 * The full URL must be constructed at runtime using getPhotoUrl() from utils/photo.ts.
 * This prevents API keys from being stored in the database.
 */
function convertPhotos(photos?: GooglePlace["photos"]): Place["photos"]["uncategorized"] {
  if (!photos || photos.length === 0) {
    return [];
  }

  return photos.map((photo) => ({
    id: photo.name,
    // Store only the photo reference - URL must be constructed at runtime
    // Use getPhotoUrl(photo.name) from utils/photo.ts to get the full URL
    photoUrl: photo.name,
  }));
}

/**
 * Converts Google payment options to internal PaymentMethods enum
 */
function convertPaymentOptions(options?: GooglePlace["paymentOptions"]): PaymentMethods[] | undefined {
  if (options === undefined) {
    return undefined;
  }

  const methods: PaymentMethods[] = [];

  if (options.acceptsCashOnly === true) {
    methods.push(PaymentMethods.CASH);
  }
  if (options.acceptsCreditCards === true) {
    methods.push(PaymentMethods.CREDIT_CARD);
  }
  if (options.acceptsDebitCards === true) {
    methods.push(PaymentMethods.DEBIT_CARD);
  }
  if (options.acceptsNfc === true) {
    methods.push(PaymentMethods.NFC);
  }

  // If no specific option but not cash only, assume cash is accepted
  if (methods.length === 0 || (options.acceptsCashOnly !== true && methods.length > 0)) {
    if (!methods.includes(PaymentMethods.CASH)) {
      methods.unshift(PaymentMethods.CASH);
    }
  }

  return methods.length > 0 ? methods : undefined;
}
