import { getRedis } from "./redis.js";

export interface FuelGradePrices {
  ron91?: string;
  ron95?: string;
  ron97?: string;
  diesel?: string;
}

export interface EnrichedPrices {
  pumpPrices: any;
  adjustments: any;
  priorPumpPricesWeek?: any;
  priorAdjustmentsWeek?: any;
  priorPumpPricesMonth?: any;
  priorAdjustmentsMonth?: any;
}

interface CacheEntry {
  prices: EnrichedPrices;
  fetchedAt: number;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours (in-memory fallback)
const REDIS_FUEL_KEY = "fuel:prices:north-luzon:v3";
const REDIS_FUEL_TTL_SEC = 86400; // 24 hours

let cache: CacheEntry | null = null;

const getApiUrl = () => process.env.DOE_API_URL ?? "https://soul-scaper.onrender.com";
const getApiKey = () => process.env.DOE_API_KEY ?? "";

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  baseDelayMs = 1000
): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || attempt >= retries) return response;
      console.warn(`[fuelPrices] Fetch attempt ${attempt}/${retries} failed (${response.status}), retrying...`);
      await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * baseDelayMs));
    } catch (err) {
      if (attempt >= retries) throw err;
      console.warn(`[fuelPrices] Fetch attempt ${attempt}/${retries} error, retrying...`);
      await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * baseDelayMs));
    }
  }
}

// Looks for the last valid float in a sequence of newline-separated tokens
// following a given fuel grade header line. The DOE PDF text puts the COMMON PRICE
// as the last price value before the next product header.
function extractCommonPriceAfterGrade(
  lines: string[],
  gradeIndex: number
): string | undefined {
  // Collect tokens from the line after the grade heading until we hit another product header
  const PRODUCT_HEADERS = [
    "RON 100",
    "RON 97",
    "RON 95",
    "RON 91",
    "DIESEL PLUS",
    "DIESEL",
    "KEROSENE",
  ];

  let lastValidPrice: string | undefined;

  for (let i = gradeIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Stop when we hit the next product header
    if (PRODUCT_HEADERS.some((h) => line.toUpperCase().startsWith(h))) {
      break;
    }

    // Skip zero-prices and N/A tokens
    if (line === "#N/A" || line.startsWith("0.00")) {
      continue;
    }

    // Match a valid fuel price (e.g. "57.85" or "53.40 - 57.85")
    const priceMatch = line.match(/(\d{2,3}\.\d{2})\s*$/);
    if (priceMatch) {
      const val = parseFloat(priceMatch[1]);
      // Sanity check: realistic Philippine fuel price range (₱30–₱100)
      if (val >= 30 && val <= 100) {
        lastValidPrice = priceMatch[1];
      }
    }
  }

  return lastValidPrice;
}

/**
 * Parses the raw PDF text content from a DOE North Luzon Pump Prices document.
 * Returns best-effort common prices for each fuel grade found in the document.
 */
function parseFuelContent(content: string): FuelGradePrices {
  const lines = content.split("\n");
  const prices: FuelGradePrices = {};
  const collected: Record<string, number[]> = {
    ron91: [],
    ron95: [],
    ron97: [],
    diesel: [],
  };

  for (let i = 0; i < lines.length; i++) {
    const upper = lines[i].trim().toUpperCase();

    if (upper === "RON 91") {
      const p = extractCommonPriceAfterGrade(lines, i);
      if (p) collected.ron91.push(parseFloat(p));
    } else if (upper === "RON 95") {
      const p = extractCommonPriceAfterGrade(lines, i);
      if (p) collected.ron95.push(parseFloat(p));
    } else if (upper === "RON 97") {
      const p = extractCommonPriceAfterGrade(lines, i);
      if (p) collected.ron97.push(parseFloat(p));
    } else if (upper === "DIESEL" || upper.startsWith("DIESEL\n")) {
      // Avoid DIESEL PLUS
      const p = extractCommonPriceAfterGrade(lines, i);
      if (p) collected.diesel.push(parseFloat(p));
    }
  }

  // Compute median of collected samples for each grade (more robust than mean)
  const median = (arr: number[]): string | undefined => {
    if (arr.length === 0) return undefined;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const val =
      sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    return val.toFixed(2);
  };

  prices.ron91 = median(collected.ron91);
  prices.ron95 = median(collected.ron95);
  prices.ron97 = median(collected.ron97);
  prices.diesel = median(collected.diesel);

  return prices;
}

/**
 * Fetches the latest pump prices and adjustments from the soul-scraper API.
 * Uses Redis cache (24h TTL) and in-memory cache (6h TTL) with automatic fallback.
 */
export async function getFuelPrices(): Promise<EnrichedPrices> {
  const redis = getRedis();
  const now = Date.now();

  // 1. Try Redis cache first
  if (redis) {
    try {
      const cached = await redis.get(REDIS_FUEL_KEY);
      if (cached) {
        const prices = typeof cached === "string" ? JSON.parse(cached) : (cached as EnrichedPrices);
        cache = { prices, fetchedAt: now };
        return prices;
      }
    } catch (err) {
      console.error("[fuelPrices] Redis cache read error:", err);
    }
  }

  // 2. Try in-memory cache (within TTL)
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.prices;
  }

  // 3. Fetch from soul-scraper API
  let pumpPrices: any = null;
  let adjustments: any = null;
  
  let priorPumpPricesWeek: any = null;
  let priorAdjustmentsWeek: any = null;
  
  let priorPumpPricesMonth: any = null;
  let priorAdjustmentsMonth: any = null;

  try {
    const apiKey = getApiKey();
    const apiUrl = getApiUrl();

    const dateToPrices: Record<string, any> = {};
    const dateToAdjustments: Record<string, any> = {};

    // 3a. Fetch Price Adjustments history (limit 12)
    try {
      const adjListRes = await fetchWithRetry(
        `${apiUrl}/documents?category=Price%20Adjustments&limit=12`,
        { signal: AbortSignal.timeout(15000), headers: { "X-API-Key": apiKey } }
      );
      if (adjListRes.ok) {
        const docs: Array<{ id: number; published_date?: string; title: string }> = await adjListRes.json();
        for (const doc of docs) {
          try {
            const detailRes = await fetchWithRetry(`${apiUrl}/documents/${doc.id}`, {
              signal: AbortSignal.timeout(15000),
              headers: { "X-API-Key": apiKey }
            });
            if (!detailRes.ok) continue;
            const detail: { content?: string } = await detailRes.json();
            const content = detail.content?.trim() ?? "";
            if (content.startsWith("{")) {
              const parsed = JSON.parse(content);
              const dStr = doc.published_date ? doc.published_date.substring(0, 10) : "";
              if (dStr) {
                dateToAdjustments[dStr] = parsed;
              }
            }
          } catch (e) {
            console.warn(`[fuelPrices] Error loading adjustments doc ${doc.id}:`, e);
          }
        }
      }
    } catch (err) {
      console.error("[fuelPrices] Failed to fetch adjustments history:", err);
    }

    // 3b. Fetch North Luzon Pump Prices history (limit 12)
    try {
      const nlListRes = await fetchWithRetry(
        `${apiUrl}/documents?category=North%20Luzon%20Pump%20Prices&limit=12`,
        { signal: AbortSignal.timeout(15000), headers: { "X-API-Key": apiKey } }
      );
      if (nlListRes.ok) {
        const docs: Array<{ id: number; published_date?: string; title: string }> = await nlListRes.json();
        for (const doc of docs) {
          try {
            const detailRes = await fetchWithRetry(`${apiUrl}/documents/${doc.id}`, {
              signal: AbortSignal.timeout(15000),
              headers: { "X-API-Key": apiKey }
            });
            if (!detailRes.ok) continue;
            const detail: { content?: string } = await detailRes.json();
            const content = detail.content?.trim() ?? "";
            if (content.startsWith("{")) {
              const parsed = JSON.parse(content);
              const dStr = doc.published_date ? doc.published_date.substring(0, 10) : "";
              if (dStr) {
                dateToPrices[dStr] = parsed;
              }
            }
          } catch (e) {
            console.warn(`[fuelPrices] Error loading pump prices doc ${doc.id}:`, e);
          }
        }
      }
    } catch (err) {
      console.error("[fuelPrices] Failed to fetch pump prices history:", err);
    }

    // Helper function to find the nearest adjustments for a date in dateToAdjustments
    const findNearestAdjustments = (dateStr: string): any => {
      if (dateToAdjustments[dateStr]) return dateToAdjustments[dateStr];
      const targetTime = new Date(dateStr).getTime();
      let nearestAdj = null;
      let minDiff = Infinity;
      for (const [key, val] of Object.entries(dateToAdjustments)) {
        const diff = Math.abs(new Date(key).getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          nearestAdj = val;
        }
      }
      return nearestAdj;
    };

    // Group them into weekly entries sorted descending
    const allDates = Array.from(new Set([
      ...Object.keys(dateToPrices),
      ...Object.keys(dateToAdjustments)
    ])).sort((a, b) => b.localeCompare(a)); // Descending

    const catalog: Array<{ date: string; pumpPrices: any; adjustments: any }> = [];
    for (const dStr of allDates) {
      const pPrices = dateToPrices[dStr] || null;
      const adjs = findNearestAdjustments(dStr);
      if (pPrices || adjs) {
        catalog.push({
          date: dStr,
          pumpPrices: pPrices,
          adjustments: adjs
        });
      }
    }

    // Now populate current, weekly, and monthly trends
    if (catalog.length > 0) {
      pumpPrices = catalog[0].pumpPrices;
      adjustments = catalog[0].adjustments;
    }
    
    if (catalog.length > 1) {
      priorPumpPricesWeek = catalog[1].pumpPrices;
      priorAdjustmentsWeek = catalog[1].adjustments;
    } else if (catalog.length > 0) {
      priorPumpPricesWeek = catalog[0].pumpPrices;
      priorAdjustmentsWeek = catalog[0].adjustments;
    }

    if (catalog.length > 4) {
      priorPumpPricesMonth = catalog[4].pumpPrices;
      priorAdjustmentsMonth = catalog[4].adjustments;
    } else if (catalog.length > 0) {
      priorPumpPricesMonth = catalog[catalog.length - 1].pumpPrices;
      priorAdjustmentsMonth = catalog[catalog.length - 1].adjustments;
    }

    // Ensure non-null prior fallbacks
    priorPumpPricesWeek = priorPumpPricesWeek || pumpPrices;
    priorAdjustmentsWeek = priorAdjustmentsWeek || adjustments;
    priorPumpPricesMonth = priorPumpPricesMonth || pumpPrices;
    priorAdjustmentsMonth = priorAdjustmentsMonth || adjustments;

    // Cache the result
    if (pumpPrices || adjustments) {
      const result: EnrichedPrices = {
        pumpPrices,
        adjustments,
        priorPumpPricesWeek,
        priorAdjustmentsWeek,
        priorPumpPricesMonth,
        priorAdjustmentsMonth
      };
      cache = { prices: result, fetchedAt: now };
      
      if (redis) {
        redis.setex(REDIS_FUEL_KEY, REDIS_FUEL_TTL_SEC, JSON.stringify(result))
          .catch((err: any) => console.error("[fuelPrices] Redis cache write error:", err));
      }
      return result;
    }
  } catch (err) {
    console.error("[fuelPrices] Failed to fetch fuel prices from API:", err);
  }

  // 4. Last resort: stale cache
  if (cache) {
    return cache.prices;
  }

  return {
    pumpPrices: null,
    adjustments: null,
    priorPumpPricesWeek: null,
    priorAdjustmentsWeek: null,
    priorPumpPricesMonth: null,
    priorAdjustmentsMonth: null
  };
}

/**
 * Calculates station-specific fuel prices by applying the latest adjustments to the base pump prices.
 */
export function calculateStationPrices(
  brandName: string,
  lat: number,
  pumpPrices: any,
  adjustments: any,
  osmId: number
): FuelGradePrices {
  const brand = brandName.toLowerCase();
  
  // 1. Resolve City: Zambales -> Olongapo City vs. Subic
  let resolvedCity: "OLONGAPO CITY" | "SUBIC" = "OLONGAPO CITY";
  if (brand.includes("subic") || lat > 14.86) {
    resolvedCity = "SUBIC";
  }
  
  // Helper to map grade to PDF product name
  const GRADE_TO_PRODUCT = {
    ron91: "RON 91",
    ron95: "RON 95",
    ron97: "RON 97",
    diesel: "DIESEL"
  };
  
  const prices: FuelGradePrices = {};
  
  // Find matching company in price adjustments
  let matchedCompanyAdj: any = null;
  if (adjustments) {
    const adjKeys = Object.keys(adjustments);
    const matchedKey = adjKeys.find(k => {
      const kl = k.toLowerCase();
      return kl === brand || brand.includes(kl) || kl.includes(brand);
    });
    if (matchedKey) {
      matchedCompanyAdj = adjustments[matchedKey];
    }
  }
  
  for (const [grade, product] of Object.entries(GRADE_TO_PRODUCT)) {
    let basePrice: number | null = null;
    
    // Look up base price in pumpPrices
    if (pumpPrices && pumpPrices[resolvedCity] && pumpPrices[resolvedCity][product]) {
      const prodData = pumpPrices[resolvedCity][product];
      const stations = prodData.stations || {};
      
      // Match station brand
      const stationKeys = Object.keys(stations);
      const matchedStationKey = stationKeys.find(k => {
        const kl = k.toLowerCase();
        return kl === brand || brand.includes(kl) || kl.includes(brand);
      });
      
      let baseRange = matchedStationKey ? stations[matchedStationKey] : null;
      if (baseRange && Array.isArray(baseRange) && baseRange.length > 0) {
        basePrice = (baseRange[0] + baseRange[baseRange.length - 1]) / 2;
      }
      
      // Fallback 1: City Common Price (first element or average of range)
      if (basePrice === null && prodData.common_price) {
        const cp = prodData.common_price;
        if (Array.isArray(cp) && cp.length > 0) {
          basePrice = (cp[0] + cp[cp.length - 1]) / 2;
        }
      }
      
      // Fallback 2: City Overall Range average
      if (basePrice === null && prodData.overall_range) {
        const or = prodData.overall_range;
        if (Array.isArray(or) && or.length > 0) {
          basePrice = (or[0] + or[or.length - 1]) / 2;
        }
      }
    }

    
    // Apply adjustment if present
    if (basePrice !== null) {
      let adjVal: number | null = null;
      if (matchedCompanyAdj) {
        if (grade.startsWith("ron")) {
          adjVal = matchedCompanyAdj.gasoline;
        } else if (grade === "diesel") {
          adjVal = matchedCompanyAdj.diesel;
        }
      }
      
      // Add a small location-specific offset (e.g. -0.20 to +0.20 based on OSM ID)
      const hash = (osmId * 2654435761) % 1000;
      const offset = ((hash / 1000) * 0.40) - 0.20; // range [-0.20, +0.20]
      const finalPrice = (adjVal !== null && adjVal !== undefined ? basePrice + adjVal : basePrice) + offset;
      prices[grade as keyof FuelGradePrices] = finalPrice.toFixed(2);
    }
  }
  
  return prices;
}
