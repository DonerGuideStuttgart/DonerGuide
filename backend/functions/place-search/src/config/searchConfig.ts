/**
 * Configuration for Stuttgart Döner Grid Search
 */

/**
 * Google Places API configuration
 */
export const API_CONFIG = {
  textQueries: ["Döner", "Kebab"],
  maxResultCount: 20, // API maximum per request (pagination required for more)
  languageCode: "de",
  rateLimitMs: 100, // ~10 requests per second
  maxRetries: 3,
  paginationDelayMs: 2000, // Google requires delay before using nextPageToken

  /**
   * Limits pagination to 3 pages (max 60 results total).
   * This matches Google's hard limit and prevents unnecessary costs or infinite loops.
   */
  maxPaginationPages: 3,

  /**
   * Field configuration to control data depth and API costs.
   * Requests are billed at the highest SKU tier triggered by any enabled field.
   *
   * - Essentials: Always included (10k free/month)
   * - Pro: Triggers Pro tier (5k free/month)
   * - Enterprise: Triggers Enterprise tier (1k free/month)
   * - Atmosphere: Triggers Atmosphere tier (1k free/month)
   *
   * @see https://developers.google.com/maps/documentation/places/web-service/place-details
   */
  fields: {
    /**
     * Pro SKU fields (5k free/month)
     */
    pro: {
      enabled: false, // Master toggle for all Pro fields
      includeDisplayName: true, // Restaurant name
      includeBusinessStatus: true, // Open/closed status
      includeAccessibility: true, // Wheelchair access
    },

    /**
     * Enterprise SKU fields (1k free/month)
     */
    enterprise: {
      enabled: false, // Master toggle for all Enterprise fields
      includeOpeningHours: true, // Operating hours
      includePhoneNumber: true, // Contact number
      includeRating: true, // Rating and review count
      includeWebsite: true, // Website URL
      includePriceLevel: false, // Price range (€/€€/€€€)
    },

    /**
     * Enterprise + Atmosphere SKU fields (1k free/month)
     */
    atmosphere: {
      enabled: false, // Master toggle for Atmosphere fields
      includeServiceOptions: true, // Delivery, dine-in, takeout
      includePaymentOptions: true, // Payment methods
      includeVegetarianFood: true, // Vegetarian options
      includeReviews: false, // User reviews (large response size)
    },
  },
};

/**
 * Environment variable for Google Places API key
 * Throws an error if the key is not set
 */
const apiKey = process.env.GOOGLE_PLACES_API_KEY;
if (apiKey === undefined || apiKey === "") {
  throw new Error("GOOGLE_PLACES_API_KEY environment variable is not set");
}
export const GOOGLE_PLACES_API_KEY: string = apiKey;
