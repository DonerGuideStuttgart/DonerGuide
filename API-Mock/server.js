const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');

function readJson(file) {
  try {
    const p = path.join(dataDir, file);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
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
    if (typeof part === 'string') {
      for (const seg of part.split(',')) {
        const t = seg.trim();
        if (t) out.push(t);
      }
    } else if (typeof part === 'number' || typeof part === 'boolean') {
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
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (!s) return null;
    if (s === 'true' || s === '1' || s === 'yes' || s === 'y') return true;
    if (s === 'false' || s === '0' || s === 'no' || s === 'n') return false;
  }
  return null;
}

/**
 * Parse numeric value safely. Returns null for NaN / unset.
 */
function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
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
  if (typeof item.rating === 'number') return item.rating;
  if (typeof item.ai_score === 'number') return item.ai_score;
  return -Infinity;
}

app.get('/places', (req, res) => {
  try {
    const list = readJson('places_list.json'); // dataDir already points to /data
    if (!list) {
      return res.status(500).json({ message: 'Failed to load places list' });
    }

    // Preserve existing response shape: items + meta
    const originalItems = Array.isArray(list.items) ? list.items : Array.isArray(list) ? list : [];
    const datasetHasHalal = originalItems.some((it) => Object.prototype.hasOwnProperty.call(it, 'halal'));

    // 1) Parse filters
    // - district: string or array; case-insensitive substring match
    const districtFiltersRaw = parseMulti(req.query, 'district');
    const districtFilters = districtFiltersRaw
      ? districtFiltersRaw.map((d) => d.toLowerCase())
      : null;

    // - rating: number (1-5); minimum. If dataset has 'rating', use it; else map to ai_score >= rating*20
    const ratingMin = parseNumber(req.query.rating);
    const ratingMinValid = ratingMin !== null && ratingMin >= 1 && ratingMin <= 5 ? ratingMin : null;

    // - price range: inclusive bounds
    const priceMin = parseNumber(req.query.price_min);
    const priceMax = parseNumber(req.query.price_max);

    // - vegetarian: boolean-like mapping to servesVegetarianFood
    const vegetarian = parseBoolean(req.query.vegetarian);

    // - halal: boolean-like; only apply if dataset has 'halal' field
    const halal = parseBoolean(req.query.halal);
    const applyHalal = datasetHasHalal && halal !== null;

    // - waiting_time: enum FAST | AVERAGE | SLOW
    const ALLOWED_WAITING = new Set(['FAST', 'AVERAGE', 'SLOW']);
    const waitingFilters = normalizeUpperFrom(parseMulti(req.query, 'waiting_time'), ALLOWED_WAITING);

    // - payment_methods: enum CASH | CREDIT_CARD | DEBIT_CARD | NFC (ANY match)
    const ALLOWED_PM = new Set(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'NFC']);
    const paymentFilters = normalizeUpperFrom(parseMulti(req.query, 'payment_methods'), ALLOWED_PM);

    // 2) Apply filtering
    let filtered = originalItems.filter((item) => {
      // district filter: case-insensitive substring match on item.district
      if (districtFilters && districtFilters.length) {
        const d = typeof item.district === 'string' ? item.district.toLowerCase() : '';
        if (!districtFilters.some((q) => d.includes(q))) return false;
      }

      // rating/ai_score minimum
      if (ratingMinValid !== null) {
        if (typeof item.rating === 'number') {
          if (!(item.rating >= ratingMinValid)) return false;
        } else if (typeof item.ai_score === 'number') {
          const threshold = ratingMinValid * 20;
          if (!(item.ai_score >= threshold)) return false;
        }
        // If neither rating nor ai_score exists, treat as not filtered out (graceful)
      }

      // price_min inclusive
      if (priceMin !== null) {
        if (typeof item.price !== 'number' || !(item.price >= priceMin)) return false;
      }
      // price_max inclusive
      if (priceMax !== null) {
        if (typeof item.price !== 'number' || !(item.price <= priceMax)) return false;
      }

      // vegetarian exact match
      if (vegetarian !== null) {
        if (typeof item.servesVegetarianFood !== 'boolean' || item.servesVegetarianFood !== vegetarian) {
          return false;
        }
      }

      // halal exact match (only if dataset contains halal)
      if (applyHalal) {
        if (typeof item.halal !== 'boolean' || item.halal !== halal) {
          return false;
        }
      }

      // waiting_time exact enum match (ANY of provided)
      if (waitingFilters && waitingFilters.length) {
        const wt = typeof item.waiting_time === 'string' ? item.waiting_time.toUpperCase() : '';
        if (!waitingFilters.includes(wt)) return false;
      }

      // payment_methods: ANY match
      if (paymentFilters && paymentFilters.length) {
        const methods = Array.isArray(item.paymentMethods) ? item.paymentMethods : [];
        const normalized = methods.map((m) => String(m).toUpperCase());
        const anyMatch = paymentFilters.some((pm) => normalized.includes(pm));
        if (!anyMatch) return false;
      }

      return true;
    });

    // 3) Sorting
    // Default: preserve original order (no sorting) to match current behavior when 'sort' not provided.
    const sortParam = typeof req.query.sort === 'string' ? req.query.sort : null;
    if (sortParam === 'rating_desc' || sortParam === 'rating_asc') {
      filtered = [...filtered].sort((a, b) => {
        const av = ratingValueForSort(a);
        const bv = ratingValueForSort(b);
        // When dataset lacks 'rating', av/bv will be ai_score; otherwise rating
        return sortParam === 'rating_desc' ? bv - av : av - bv;
      });
    } else if (sortParam === 'price_asc' || sortParam === 'price_desc') {
      filtered = [...filtered].sort((a, b) => {
        const av = typeof a.price === 'number' ? a.price : (sortParam === 'price_asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        const bv = typeof b.price === 'number' ? b.price : (sortParam === 'price_asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        return sortParam === 'price_desc' ? bv - av : av - bv;
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
        totalPages
      }
    };

    return res.json(response);
  } catch (err) {
    return res.status(500).json({ message: 'Unexpected error' });
  }
});

app.get('/places/:id', (req, res) => {
  const id = req.params.id;
  const file = `place_${id}.json`;
  const place = readJson(file);
  if (!place) {
    return res.status(404).json({ message: 'Place not found' });
  }
  res.json(place);
});

/**
 * Serve the OpenAPI specification for easy inspection.
 */
app.get('/openapi.yaml', (req, res) => {
  res.sendFile(path.join(__dirname, 'openapi.yaml'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API Mock listening on http://localhost:${port}`));
