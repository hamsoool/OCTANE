import { Router } from "express";
import { getFuelPrices, calculateStationPrices } from "../utils/fuelPrices.js";
import { getRedis } from "../utils/redis.js";

const router = Router();

// Redis cache for Overpass station data (24h TTL)
const REDIS_STATIONS_KEY = "stations:zambales";
const REDIS_CACHE_TTL_SEC = 86400;

// In-memory fallback (used when Redis is unavailable)
let inMemoryCache: { stations: any[]; fetchedAt: number } | null = null;
const IN_MEMORY_TTL_MS = 60 * 60 * 1000; // 1 hour

const cleanStationName = (rawName?: string, rawBrand?: string): string => {
  const name = rawName || rawBrand || "UNNAMED_UNIT";
  return name.trim().toUpperCase().replace(/[\s\-]+/g, "_");
};

const getSeededPrice = (osmId: number, brand?: string): string => {
  const base = 1.70;
  const hash = (osmId * 2654435761) % 1000;
  const offset = (hash / 1000) * 0.35;

  let brandBonus = 0;
  if (brand) {
    const b = brand.toLowerCase();
    if (b.includes("shell") || b.includes("caltex")) {
      brandBonus = 0.05;
    } else if (b.includes("petron") || b.includes("seaoil") || b.includes("total")) {
      brandBonus = 0.02;
    } else if (b.includes("flying v") || b.includes("uno") || b.includes("jetti") || b.includes("phoenix")) {
      brandBonus = -0.03;
    }
  }

  const price = base + offset + brandBonus;
  return price.toFixed(3);
};

async function fetchOverpassStations(): Promise<any[] | null> {
  const query = `[out:json][timeout:25];
(
  area["name"="Zambales"];
  area["name"="Olongapo"];
)->.searchAreas;
(
  node["amenity"="fuel"](area.searchAreas);
  way["amenity"="fuel"](area.searchAreas);
  relation["amenity"="fuel"](area.searchAreas);
);
out center;`;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "octane-fuel-price-intelligence-client"
      },
      body: "data=" + encodeURIComponent(query)
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = (await response.json()) as any;
    if (!data.elements) return null;

    const stations = data.elements.map((el: any) => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      const name = cleanStationName(el.tags?.name, el.tags?.brand);
      return {
        id: el.id.toString(),
        name,
        brand: (el.tags?.brand || el.tags?.name || "").toLowerCase(),
        coordinates: [lon, lat]
      };
    }).filter((s: any) => !isNaN(s.coordinates[0]) && !isNaN(s.coordinates[1]));

    return stations.length > 0 ? stations : null;
  } catch (error) {
    console.error("Error fetching from Overpass API:", error);
    return null;
  }
}

router.get("/", async (req, res) => {
  const redis = getRedis();
  let stations: any[] | null = null;
  let fromRedis = false;

  // 1. Try Redis cache
  if (redis) {
    try {
      const cached = await redis.get(REDIS_STATIONS_KEY);
      if (cached) {
        stations = typeof cached === "string" ? JSON.parse(cached) : (cached as any[]);
        fromRedis = true;
      }
    } catch (err) {
      console.error("Redis cache read error:", err);
    }
  }

  // 2. Fall back to in-memory if no Redis data
  if (!stations && inMemoryCache) {
    stations = inMemoryCache.stations;
  }

  // 3. Refresh from Overpass if needed
  const cacheAge = inMemoryCache ? Date.now() - inMemoryCache.fetchedAt : Infinity;
  const isStale = cacheAge >= IN_MEMORY_TTL_MS;

  if (!stations || (!fromRedis && isStale)) {
    const overpassData = await fetchOverpassStations();
    if (overpassData) {
      stations = overpassData;
      inMemoryCache = { stations: overpassData, fetchedAt: Date.now() };
      fromRedis = false;

      if (redis) {
        redis.setex(REDIS_STATIONS_KEY, REDIS_CACHE_TTL_SEC, JSON.stringify(overpassData))
          .catch((err: any) => console.error("Redis cache write error:", err));
      }
    }
  }

  // 4. Last resort: stale in-memory
  if (!stations && inMemoryCache) {
    stations = inMemoryCache.stations;
  }

  // 5. Still no data — return empty
  if (!stations) {
    res.json([]);
    return;
  }

  // 6. Enrich with fuel prices
  const { pumpPrices, adjustments } = await getFuelPrices();
  const preferredGrade = (process.env.DOE_PREFERRED_GRADE ?? "ron91") as "ron91" | "ron95" | "ron97" | "diesel";

  const enriched = stations.map((s: any) => {
    const lat = s.coordinates[1];
    const stationPrices = calculateStationPrices(s.brand, lat, pumpPrices, adjustments, parseInt(s.id, 10));

    const primaryPrice =
      stationPrices[preferredGrade] ??
      stationPrices.ron91 ??
      stationPrices.diesel ??
      getSeededPrice(parseInt(s.id, 10), s.brand);

    const gradeLabel = stationPrices[preferredGrade]
      ? preferredGrade.toUpperCase().replace("RON", "RON_")
      : "ESTIMATED";

    return {
      id: s.id,
      name: s.name,
      brand: s.brand,
      preferredGrade,
      price: primaryPrice,
      priceGrade: gradeLabel,
      fuelData: {
        diesel: stationPrices.diesel,
        ron91: stationPrices.ron91,
        ron95: stationPrices.ron95,
        ron97: stationPrices.ron97,
      },
      coordinates: s.coordinates,
    };
  });

  res.json(enriched.length > 0 ? enriched : stations);
});

export default router;
