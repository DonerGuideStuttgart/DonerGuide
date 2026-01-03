const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, "data");

function readJson(file) {
  try {
    const p = path.join(dataDir, file);
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    return null;
  }
}

/**
 * Parse a multi-value query param supporting:
 * - repeated params: ?param=a&param=b
 * - comma-separated values: ?param=a,b
 * Returns null when unset/empty.
 */
function parseMulti(q, name) {
  const v = q[name];
  if (v === undefined || v === null) return null;
  const raw = Array.isArray(v) ? v : [v];
  const out = [];
  for (const part of raw) {
    if (typeof part === "string") {
      for (const seg of part.split(",")) {
        const t = seg.trim();
        if (t) out.push(t);
      }
    } else if (typeof part === "number" || typeof part === "boolean") {
      out.push(String(part));
    }
  }
  return out.length ? out : null;
}

/**
 * Parse boolean-like values from strings/numbers/booleans.
 * Accepts: true/false/1/0/yes/no (case-insensitive).
 * Returns null when unparseable or empty.
 */
function parseBoolean(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (!s) return null;
    if (s === "true" || s === "1" || s === "yes" || s === "y") return true;
    if (s === "false" || s === "0" || s === "no" || s === "n") return false;
  }
  return null;
}

/**
 * Parse numeric value safely. Returns null for NaN / unset.
 */
function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse limit (default 20, must be positive) and offset (default 0, non-negative).
 */
function parseLimitOffset(q) {
  let limit = parseInt(q.limit, 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = 20;
  let offset = parseInt(q.offset, 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  return { limit, offset };
}

/**
 * Normalize an array of strings to uppercase unique values from a whitelist.
 */
function normalizeUpperFrom(arr, allowedSet) {
  if (!arr || !arr.length) return null;
  const out = [];
  const seen = new Set();
  for (const v of arr) {
    const u = String(v).trim().toUpperCase();
    if (!u) continue;
    if (allowedSet && !allowedSet.has(u)) continue;
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out.length ? out : null;
}

/**
 * Get numeric "rating" for sorting:
 * - Prefer 'rating' if present, otherwise use 'ai_score'.
 */
function ratingValueForSort(item) {
  if (typeof item.rating === "number") return item.rating;
  if (typeof item.ai_score === "number") return item.ai_score;
  return -Infinity;
}

app.get("/places", (req, res) => {
  try {
    const list = readJson("places_list.json"); // dataDir already points to /data
    if (!list) {
      return res.status(500).json({ message: "Failed to load places list" });
    }

    // Preserve existing response shape: items + meta
    const originalItems = Array.isArray(list.items)
      ? list.items
      : Array.isArray(list)
      ? list
      : [];
    const datasetHasHalal = originalItems.some((it) =>
      Object.prototype.hasOwnProperty.call(it, "halal")
    );

    // 1) Parse filters
    // - district: string or array; case-insensitive substring match
    const districtFiltersRaw = parseMulti(req.query, "district");
    const districtFilters = districtFiltersRaw
      ? districtFiltersRaw.map((d) => d.toLowerCase())
      : null;

    // - rating: number (1-5); minimum. If dataset has 'rating', use it; else map to ai_score >= rating*20
    const ratingMin = parseNumber(req.query.rating);
    const ratingMinValid =
      ratingMin !== null && ratingMin >= 1 && ratingMin <= 5 ? ratingMin : null;

    // - min_score/max_score: ai_score range (0-100)
    const minScore = parseNumber(req.query.min_score);
    const maxScore = parseNumber(req.query.max_score);

    // - price range: inclusive bounds
    const priceMin = parseNumber(req.query.price_min);
    const priceMax = parseNumber(req.query.price_max);

    // - sauce_amount range (0-100)
    const sauceMin = parseNumber(req.query.sauce_amount_min);
    const sauceMax = parseNumber(req.query.sauce_amount_max);

    // - meat_ratio range (0-100)
    const meatMin = parseNumber(req.query.meat_ratio_min);
    const meatMax = parseNumber(req.query.meat_ratio_max);

    // - vegetarian: array filter for vegetarian options
    // Accepts: meat, vegetarian, vegan
    const ALLOWED_VEGETARIAN = new Set(["VEGETARIAN", "VEGAN"]);
    const vegetarianFilters = normalizeUpperFrom(
      parseMulti(req.query, "vegetarian"),
      ALLOWED_VEGETARIAN
    );

    // - halal: array filter for halal options
    // Accepts: HALAL, NOT_HALAL
    const ALLOWED_HALAL = new Set(["HALAL", "NOT_HALAL"]);
    const halalFilters = normalizeUpperFrom(
      parseMulti(req.query, "halal"),
      ALLOWED_HALAL
    );

    // - waiting_time: enum FAST | AVERAGE | SLOW
    const ALLOWED_WAITING = new Set(["FAST", "AVERAGE", "SLOW"]);
    const waitingFilters = normalizeUpperFrom(
      parseMulti(req.query, "waiting_time"),
      ALLOWED_WAITING
    );

    // - payment_methods: enum CASH | CREDIT_CARD (Kartenzahlung)
    const ALLOWED_PM = new Set(["CASH", "CREDIT_CARD"]);
    const paymentFilters = normalizeUpperFrom(
      parseMulti(req.query, "payment_methods"),
      ALLOWED_PM
    );

    // 2) Apply filtering
    let filtered = originalItems.filter((item) => {
      // district filter: case-insensitive substring match on item.district
      if (districtFilters && districtFilters.length) {
        const d =
          typeof item.district === "string" ? item.district.toLowerCase() : "";
        if (!districtFilters.some((q) => d.includes(q))) return false;
      }

      // rating/ai_score minimum
      if (ratingMinValid !== null) {
        if (typeof item.rating === "number") {
          if (!(item.rating >= ratingMinValid)) return false;
        } else if (typeof item.ai_score === "number") {
          const threshold = ratingMinValid * 20;
          if (!(item.ai_score >= threshold)) return false;
        }
        // If neither rating nor ai_score exists, treat as not filtered out (graceful)
      }

      // min_score (ai_score minimum)
      if (minScore !== null) {
        if (typeof item.ai_score !== "number" || !(item.ai_score >= minScore))
          return false;
      }
      // max_score (ai_score maximum)
      if (maxScore !== null) {
        if (typeof item.ai_score !== "number" || !(item.ai_score <= maxScore))
          return false;
      }

      // price_min inclusive
      if (priceMin !== null) {
        if (typeof item.price !== "number" || !(item.price >= priceMin))
          return false;
      }
      // price_max inclusive
      if (priceMax !== null) {
        if (typeof item.price !== "number" || !(item.price <= priceMax))
          return false;
      }

      // sauce_amount_min
      if (sauceMin !== null) {
        if (
          typeof item.sauce_amount !== "number" ||
          !(item.sauce_amount >= sauceMin)
        )
          return false;
      }
      // sauce_amount_max
      if (sauceMax !== null) {
        if (
          typeof item.sauce_amount !== "number" ||
          !(item.sauce_amount <= sauceMax)
        )
          return false;
      }

      // meat_ratio_min
      if (meatMin !== null) {
        if (
          typeof item.meat_ratio !== "number" ||
          !(item.meat_ratio >= meatMin)
        )
          return false;
      }
      // meat_ratio_max
      if (meatMax !== null) {
        if (
          typeof item.meat_ratio !== "number" ||
          !(item.meat_ratio <= meatMax)
        )
          return false;
      }

      // vegetarian: ANY match from item.vegetarian array
      if (vegetarianFilters && vegetarianFilters.length) {
        const vegOptions = Array.isArray(item.vegetarian)
          ? item.vegetarian
          : [];
        const normalized = vegOptions.map((v) => String(v).toUpperCase());
        const anyMatch = vegetarianFilters.some((vf) =>
          normalized.includes(vf)
        );
        if (!anyMatch) return false;
      }

      // halal: ANY match from item.halal array
      if (halalFilters && halalFilters.length) {
        const halalOptions = Array.isArray(item.halal) ? item.halal : [];
        const normalized = halalOptions.map((h) => String(h).toUpperCase());
        const anyMatch = halalFilters.some((hf) => normalized.includes(hf));
        if (!anyMatch) return false;
      }

      // waiting_time exact enum match (ANY of provided)
      if (waitingFilters && waitingFilters.length) {
        const wt =
          typeof item.waiting_time === "string"
            ? item.waiting_time.toUpperCase()
            : "";
        if (!waitingFilters.includes(wt)) return false;
      }

      // payment_methods: ANY match
      if (paymentFilters && paymentFilters.length) {
        const methods = Array.isArray(item.paymentMethods)
          ? item.paymentMethods
          : [];
        const normalized = methods.map((m) => String(m).toUpperCase());
        const anyMatch = paymentFilters.some((pm) => normalized.includes(pm));
        if (!anyMatch) return false;
      }

      return true;
    });

    // 3) Sorting
    // Default: preserve original order (no sorting) to match current behavior when 'sort' not provided.
    const sortParam =
      typeof req.query.sort === "string" ? req.query.sort : null;
    if (sortParam === "rating_desc" || sortParam === "rating_asc") {
      filtered = [...filtered].sort((a, b) => {
        const av = ratingValueForSort(a);
        const bv = ratingValueForSort(b);
        // When dataset lacks 'rating', av/bv will be ai_score; otherwise rating
        return sortParam === "rating_desc" ? bv - av : av - bv;
      });
    } else if (sortParam === "price_asc" || sortParam === "price_desc") {
      filtered = [...filtered].sort((a, b) => {
        const av =
          typeof a.price === "number"
            ? a.price
            : sortParam === "price_asc"
            ? Number.POSITIVE_INFINITY
            : Number.NEGATIVE_INFINITY;
        const bv =
          typeof b.price === "number"
            ? b.price
            : sortParam === "price_asc"
            ? Number.POSITIVE_INFINITY
            : Number.NEGATIVE_INFINITY;
        return sortParam === "price_desc" ? bv - av : av - bv;
      });
    }
    // else: keep as-is

    // 4) Pagination
    const { limit, offset } = parseLimitOffset(req.query);
    const totalItems = filtered.length;
    const page = Math.floor(offset / limit) + 1;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
    const items = filtered.slice(offset, offset + limit);

    // Preserve response shape
    const response = {
      items,
      meta: {
        page,
        pageSize: limit,
        totalItems,
        totalPages,
      },
    };

    return res.json(response);
  } catch (err) {
    return res.status(500).json({ message: "Unexpected error" });
  }
});

app.get("/places/by-slug/:slug", (req, res) => {
  const slug = req.params.slug;

  // Read all place files and find the one matching the slug
  for (let i = 1; i <= 10; i++) {
    const file = `place_${i}.json`;
    const place = readJson(file);
    if (place && place.slug === slug) {
      return res.json(place);
    }
  }

  return res.status(404).json({ message: "Place not found" });
});

app.get("/places/:id", (req, res) => {
  const id = req.params.id;
  const file = `place_${id}.json`;
  const place = readJson(file);
  if (!place) {
    return res.status(404).json({ message: "Place not found" });
  }
  res.json(place);
});

/**
 * Serve the OpenAPI specification for easy inspection.
 */
app.get("/openapi.yaml", (req, res) => {
  res.sendFile(path.join(__dirname, "openapi.yaml"));
});

const port = process.env.PORT || 3001;
app.listen(port, () =>
  console.log(`API Mock listening on http://localhost:${port}`)
);
