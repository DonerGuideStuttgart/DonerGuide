export interface Location {
  googlePlaceId?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address: {
    postalCode: string;
    locality: string;
    sublocality: string;
    streetAddress: string;
  };
}

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type TimeInterval = {
  start: number; // Minuten seit Mitternacht
  end: number;
};

export type OpeningHours = {
  hours: Partial<Record<Weekday, TimeInterval[]>>;
  timezone: string;
};

export type Store = {
  slug: string;
  imageUrls: string[];
  name: string;
  phone?: string;
  district?: string;
  location: Location;
  aiScore: number;
  price?: number;

  // Arrays von Strings (Enums im Frontend)
  vegetarian: string[]; // z.B. ["VEGETARIAN", "VEGAN"]
  halal?: string[]; // z.B. ["HALAL"]
  waitingTime?: string; // z.B. "FAST"
  paymentMethods: string[]; // z.B. ["CREDIT_CARD", "CASH"]

  sauceAmount?: number;
  meatRatio?: number;

  openingHours: OpeningHours;
  aiSummary: string;
};

function mapOpeningHours(dbHours: any): OpeningHours {
  const defaultTimezone = "Europe/Berlin";

  if (!dbHours || typeof dbHours !== "object") {
    return { hours: {}, timezone: defaultTimezone };
  }

  const dayMapping: Record<string, Weekday> = {
    Mo: "mon",
    Tu: "tue",
    We: "wed",
    Th: "thu",
    Fr: "fri",
    Sa: "sat",
    Su: "sun",
  };

  const hours: Partial<Record<Weekday, TimeInterval[]>> = {};

  Object.keys(dayMapping).forEach((dbKey) => {
    const feKey = dayMapping[dbKey];
    const times = dbHours[dbKey];

    // DB hat: [Start, Ende] (Array mit 2 Zahlen)
    // FE will: [{ start: Start, end: Ende }] (Array mit Objekten)
    if (Array.isArray(times) && times.length === 2 && typeof times[0] === "number") {
      hours[feKey] = [{ start: times[0], end: times[1] }];
    }
  });

  return {
    hours: hours,
    timezone: defaultTimezone,
  };
}

/**
 * Haupt-Mapper
 */
export function mapToStore(item: any): Store {
  if (!item) {
    throw new Error("Item is null or undefined");
  }

  // --- 1. District Logic ---
  const district = item.district ?? item.address?.sublocality ?? "Unbekannt";

  // --- 2. Vegetarian Logic ---
  const vegetarianTags: string[] = [];
  if (item.servesVegetarianFood === true || item.servesVegetarianFood === "true") {
    vegetarianTags.push("VEGETARIAN");
    // Optional: Wenn es ein separates Feld für vegan gibt
  }

  // --- 3. Payment Methods ---
  const paymentMethods: string[] = Array.isArray(item.paymentMethods)
    ? item.paymentMethods.map((pm: string) => pm.toUpperCase())
    : [];

  // --- 4. Images ---
  const imageUrls: string[] = Array.isArray(item.photos)
    ? item.photos.map((p: any) => p.url).filter((u: any) => typeof u === "string")
    : [];

  // --- 5. Return Object ---
  return {
    slug: item.id,

    imageUrls: imageUrls,

    name: item.name ?? "Unbekannter Döner",
    phone: item.internationalPhoneNumber ?? undefined,
    district: district,

    location: {
      googlePlaceId: item.id, // Mock nutzt die ID auch hier
      coordinates: {
        lat: item.latitude ?? 0,
        lng: item.longitude ?? 0,
      },
      address: {
        postalCode: item.address?.postalCode ?? "",
        locality: item.address?.locality ?? "",
        sublocality: item.address?.sublocality ?? "",
        streetAddress: item.address?.streetAddress ?? "",
      },
    },

    aiScore: item.ai_score ?? 0,
    price: item.price ?? undefined,

    vegetarian: vegetarianTags,

    waitingTime: item.waiting_time ? item.waiting_time.toUpperCase() : undefined,

    paymentMethods: paymentMethods,

    sauceAmount: item.sauce_amount ?? undefined,
    meatRatio: item.meat_ratio ?? undefined,

    openingHours: mapOpeningHours(item.openingHours),

    // AI Summary: Fallback, falls DB leer
    aiSummary:
      item.ai_analysis?.text ??
      item.description ??
      `Leckerer Döner in ${district} mit einem AI-Score von ${item.ai_score ?? "?"}.`,
  };
}
