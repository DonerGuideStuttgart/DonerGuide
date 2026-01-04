/**
 * Google Places API Utility functions
 *
 * Contains helper functions for field masks and configuration factories.
 */

import type { FieldConfig } from "../types/googlePlaces.types";

/**
 * Fields that trigger Place Details Essentials IDs Only SKU
 * These are always included
 * @see https://developers.google.com/maps/documentation/places/web-service/place-details
 */
const ESSENTIALS_IDS_ONLY_FIELDS = [
  "places.id",
  "places.name", // Resource name (e.g., "places/ChIJ..."), NOT the display name!
  "places.photos",
  "places.attributions",
  "places.moved_place",
  "places.moved_place_id",
  // Note: For the human-readable name, use 'places.displayName' (Pro SKU)
] as const;

/**
 * Fields that trigger Place Details Essentials SKU
 * All these fields are free up to 10k requests/month
 * These can be optionally included via config
 */
const ESSENTIALS_FIELDS = [
  "places.addressComponents",
  "places.adrFormatAddress",
  "places.formattedAddress",
  "places.location",
  "places.plusCode",
  "places.postalAddress",
  "places.shortFormattedAddress",
  "places.types",
  "places.viewport",
  // Note: 'addressDescriptor' is also available but may have
  // different response structure - add if needed
] as const;

/**
 * Fields that trigger Place Details Pro SKU (5k free/month)
 * These can be optionally included via config
 */
const PRO_FIELDS = {
  displayName: "places.displayName", // Required for restaurant name
  businessStatus: "places.businessStatus", // Check if open/closed
  accessibilityOptions: "places.accessibilityOptions", // Wheelchair access
  // Note: Also available: containingPlaces, googleMapsLinks, googleMapsUri,
  // iconBackgroundColor, primaryType, primaryTypeDisplayName, etc.
} as const;

/**
 * Fields that trigger Place Details Enterprise SKU (1k free/month)
 * These can be optionally included via config
 */
const ENTERPRISE_FIELDS = {
  regularOpeningHours: "places.regularOpeningHours", // Operating hours
  internationalPhoneNumber: "places.internationalPhoneNumber", // Contact
  rating: "places.rating", // Google rating
  userRatingCount: "places.userRatingCount", // Number of reviews
  websiteUri: "places.websiteUri", // Website URL
  priceLevel: "places.priceLevel", // Price range
  // Note: Also available: currentOpeningHours, nationalPhoneNumber, priceRange
} as const;

/**
 * Fields that trigger Place Details Enterprise + Atmosphere SKU (1k free/month)
 * These can be optionally included via config
 */
const ENTERPRISE_ATMOSPHERE_FIELDS = {
  delivery: "places.delivery", // Offers delivery?
  dineIn: "places.dineIn", // Offers dine-in?
  takeout: "places.takeout", // Offers takeout?
  paymentOptions: "places.paymentOptions", // Accepted payment methods
  servesVegetarianFood: "places.servesVegetarianFood", // Vegetarian options
  reviews: "places.reviews", // User reviews (expensive!)
  // Note: Also available: allowsDogs, curbsidePickup, editorialSummary,
  // evChargeOptions, goodForChildren, liveMusic, outdoorSeating, etc.
} as const;

/**
 * Builds the field mask for Google Places API request
 *
 * IMPORTANT: Request is billed at HIGHEST SKU triggered by any field!
 *
 * @param config Optional field configuration
 * @returns Comma-separated field mask string
 */
export function buildFieldMask(config: FieldConfig): string {
  const fields: string[] = [
    // Always include Essentials (IDs Only + Essentials) - these are the base
    ...ESSENTIALS_IDS_ONLY_FIELDS,
    ...ESSENTIALS_FIELDS,
    "nextPageToken", // For pagination
  ];

  // Add Pro SKU fields only if SKU is enabled AND individual field is enabled
  if (config.pro.enabled) {
    if (config.pro.includeDisplayName) {
      fields.push(PRO_FIELDS.displayName);
    }
    if (config.pro.includeBusinessStatus) {
      fields.push(PRO_FIELDS.businessStatus);
    }
    if (config.pro.includeAccessibility) {
      fields.push(PRO_FIELDS.accessibilityOptions);
    }
  }

  // Add Enterprise SKU fields only if SKU is enabled AND individual field is enabled
  if (config.enterprise.enabled) {
    if (config.enterprise.includeOpeningHours) {
      fields.push(ENTERPRISE_FIELDS.regularOpeningHours);
    }
    if (config.enterprise.includePhoneNumber) {
      fields.push(ENTERPRISE_FIELDS.internationalPhoneNumber);
    }
    if (config.enterprise.includeRating) {
      fields.push(ENTERPRISE_FIELDS.rating);
      fields.push(ENTERPRISE_FIELDS.userRatingCount);
    }
    if (config.enterprise.includeWebsite) {
      fields.push(ENTERPRISE_FIELDS.websiteUri);
    }
    if (config.enterprise.includePriceLevel) {
      fields.push(ENTERPRISE_FIELDS.priceLevel);
    }
  }

  // Add Enterprise + Atmosphere SKU fields only if SKU is enabled AND individual field is enabled
  if (config.atmosphere.enabled) {
    if (config.atmosphere.includeServiceOptions) {
      fields.push(ENTERPRISE_ATMOSPHERE_FIELDS.delivery);
      fields.push(ENTERPRISE_ATMOSPHERE_FIELDS.dineIn);
      fields.push(ENTERPRISE_ATMOSPHERE_FIELDS.takeout);
    }
    if (config.atmosphere.includePaymentOptions) {
      fields.push(ENTERPRISE_ATMOSPHERE_FIELDS.paymentOptions);
    }
    if (config.atmosphere.includeVegetarianFood) {
      fields.push(ENTERPRISE_ATMOSPHERE_FIELDS.servesVegetarianFood);
    }
    if (config.atmosphere.includeReviews) {
      fields.push(ENTERPRISE_ATMOSPHERE_FIELDS.reviews);
    }
  }

  return fields.join(",");
}
