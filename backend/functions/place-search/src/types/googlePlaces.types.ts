/**
 * Google Places API (New) type definitions
 * Based on: https://developers.google.com/maps/documentation/places/web-service/text-search
 */

export interface TextSearchRequest {
  textQuery: string;

  /**
   * Location bias - PREFER results in the area, but CAN return results outside
   * Use for broad searches where you want suggestions
   */
  locationBias?: {
    circle: {
      center: LatLng;
      radius: number; // in meters
    };
  };

  /**
   * Location restriction - HARD LIMIT, ONLY return results within the area
   * Use for grid-based searches to prevent radius overlap issues
   */
  locationRestriction?: {
    rectangle: {
      low: LatLng;
      high: LatLng;
    };
  };

  maxResultCount?: number; // max 20
  languageCode?: string;
  pageToken?: string;
}

export interface TextSearchResponse {
  places?: GooglePlace[];
  nextPageToken?: string;
}

export interface PostalAddress {
  revision?: number;
  regionCode?: string;
  languageCode?: string;
  postalCode?: string;
  sortingCode?: string;
  administrativeArea?: string;
  locality?: string;
  sublocality?: string;
  addressLines?: string[];
  recipients?: string[];
  organization?: string;
}

export interface GooglePlace {
  id: string; // place_id (unique identifier)
  name?: string; // Resource name in format "places/PLACE_ID" (Essentials IDs Only SKU)
  displayName?: LocalizedText; // Human-readable name (Pro SKU)
  formattedAddress?: string;
  location?: LatLng;
  types?: string[];
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: OpeningHours;
  priceLevel?: PriceLevel;
  rating?: number;
  userRatingCount?: number;
  photos?: PhotoReference[];
  paymentOptions?: PaymentOptions;
  delivery?: boolean;
  dineIn?: boolean;
  takeout?: boolean;
  servesVegetarianFood?: boolean;
  addressComponents?: AddressComponent[];
  postalAddress?: PostalAddress;

  // New fields
  businessStatus?: BusinessStatus;
  accessibilityOptions?: AccessibilityOptions;
  reviews?: Review[];
}

export interface LocalizedText {
  text: string;
  languageCode: string;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface OpeningHours {
  openNow?: boolean;
  periods?: OpeningPeriod[];
  weekdayDescriptions?: string[];
}

export interface OpeningPeriod {
  open: TimeOfDay;
  close?: TimeOfDay;
  // ... existing fields
}

export interface TimeOfDay {
  day: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  minute: number; // 0-59
}

export interface PhotoReference {
  name: string; // Resource name like "places/PLACE_ID/photos/PHOTO_REFERENCE"
  widthPx: number;
  heightPx: number;
  authorAttributions?: AuthorAttribution[];
}

export interface AuthorAttribution {
  displayName: string;
  uri: string;
  photoUri: string;
}

export interface PaymentOptions {
  acceptsCreditCards?: boolean;
  acceptsDebitCards?: boolean;
  acceptsCashOnly?: boolean;
  acceptsNfc?: boolean;
}

export interface AccessibilityOptions {
  wheelchairAccessibleEntrance?: boolean;
  wheelchairAccessibleSeating?: boolean;
  wheelchairAccessibleRestroom?: boolean;
  wheelchairAccessibleParking?: boolean;
}

export interface Review {
  name: string; // Resource name
  relativePublishTimeDescription: string;
  rating: number;
  text: LocalizedText;
  originalText: LocalizedText;
  authorAttribution: AuthorAttribution;
  publishTime: string;
}

export interface AddressComponent {
  longText: string;
  shortText: string;
  types?: string[]; // Optional: Google API sometimes returns components without types
  languageCode: string;
}

export type BusinessStatus = "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY";

export type PriceLevel =
  | "PRICE_LEVEL_UNSPECIFIED"
  | "PRICE_LEVEL_FREE"
  | "PRICE_LEVEL_INEXPENSIVE"
  | "PRICE_LEVEL_MODERATE"
  | "PRICE_LEVEL_EXPENSIVE"
  | "PRICE_LEVEL_VERY_EXPENSIVE";

/**
 * Configuration for optional fields grouped by SKU
 */
export interface FieldConfig {
  /**
   * Pro SKU fields (5k free/month)
   * Set enabled: false to disable ALL Pro fields (fail-safe cost control)
   */
  pro: {
    enabled: boolean; // Master toggle for all Pro SKU fields
    includeDisplayName: boolean; // Restaurant name (highly recommended!)
    includeBusinessStatus: boolean; // Open/closed status
    includeAccessibility: boolean; // Wheelchair access info
  };

  /**
   * Enterprise SKU fields (1k free/month)
   * Set enabled: false to disable ALL Enterprise fields (fail-safe cost control)
   */
  enterprise: {
    enabled: boolean; // Master toggle for all Enterprise SKU fields
    includeOpeningHours: boolean; // Operating hours
    includePhoneNumber: boolean; // Contact number
    includeRating: boolean; // Google rating + count
    includeWebsite: boolean; // Website URL
    includePriceLevel: boolean; // Price range indicator
  };

  /**
   * Enterprise + Atmosphere SKU fields (1k free/month)
   * Set enabled: false to disable ALL Atmosphere fields (fail-safe cost control)
   * WARNING: Triggers the most expensive SKU tier!
   */
  atmosphere: {
    enabled: boolean; // Master toggle for all Atmosphere SKU fields
    includeServiceOptions: boolean; // delivery, dineIn, takeout
    includePaymentOptions: boolean; // Payment methods
    includeVegetarianFood: boolean; // Dietary options
    includeReviews: boolean; // User reviews (WARNING: large response!)
  };
}
