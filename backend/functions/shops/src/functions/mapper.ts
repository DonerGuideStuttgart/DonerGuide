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
  start: number;
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
  vegetarian: string[];
  halal?: string[];
  waitingTime?: string;
  paymentMethods: string[];
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

    // DB: [300, 1200] -> FE: [{ start: 300, end: 1200 }]
    if (Array.isArray(times) && times.length === 2 && typeof times[0] === "number") {
      hours[feKey] = [{ start: times[0], end: times[1] }];
    }
  });

  return { hours, timezone: defaultTimezone };
}

function scaleScoreToPercent(score: any): number | undefined {
  if (typeof score !== "number") return undefined;
  // Wenn Score <= 10 ist, gehen wir von einer 1-5 oder 1-10 Skala aus und skalieren auf 100
  if (score <= 5) return score * 20;
  if (score <= 10) return score * 10;
  return score; // Sonst nehmen wir den Wert direkt (z.B. 65)
}

export function mapToStore(item: any): Store {
  if (!item) {
    throw new Error("Item is null or undefined");
  }

  // Daten aus ai_analysis extrahieren (Fallback)
  const analysis = item.ai_analysis || {};

  // 1. District
  const district = item.address?.sublocality ?? item.address?.locality ?? "Unbekannt";

  // 2. Images
  const imageUrls: string[] = Array.isArray(item.public_photos)
    ? item.public_photos.map((p: any) => p.url).filter((u: any) => typeof u === "string")
    : [];

  // 3. Scores & Ratios
  const rawAiScore = analysis.score_gesamt ?? 0;

  // Fleisch & Soße:
  const meatRatio = item.meat_ratio ?? scaleScoreToPercent(analysis.score_belag);
  const sauceAmount = item.sauce_amount ?? scaleScoreToPercent(analysis.score_verhaeltnis);

  // 4. Vegetarian
  const vegetarianTags: string[] = [];
  if (item.servesVegetarianFood === true) {
    vegetarianTags.push("VEGETARIAN");
  }

  // 5. Payment Methods
  const paymentMethods = Array.isArray(item.paymentMethods)
    ? item.paymentMethods.map((p: string) => p.toUpperCase())
    : [];

  return {
    slug: item.id, // ID als Slug
    imageUrls: imageUrls,
    name: item.name ?? "Unbekannter Laden",
    phone: item.internationalPhoneNumber ?? item.phone ?? undefined,
    district: district,

    location: {
      googlePlaceId: item.id,
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

    aiScore: rawAiScore,
    price: item.price ?? undefined,

    vegetarian: vegetarianTags,
    halal: item.halal ? [item.halal] : [],

    waitingTime: item.waiting_time ? item.waiting_time.toUpperCase() : undefined,
    paymentMethods: paymentMethods,

    sauceAmount: sauceAmount,
    meatRatio: meatRatio,

    openingHours: mapOpeningHours(item.openingHours),

    aiSummary: analysis.bewertungstext ?? item.description ?? "Keine Zusammenfassung verfügbar.",
  };
}
