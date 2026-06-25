import { Router } from "express";
import { getFuelPrices } from "../utils/fuelPrices.js";

const router = Router();

let cachedStations: any[] = [];
let lastFetched: number = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

const cleanStationName = (rawName?: string, rawBrand?: string): string => {
  const name = rawName || rawBrand || "UNNAMED_UNIT";
  return name.trim().toUpperCase().replace(/[\s\-]+/g, "_");
};

/**
 * Seeded price fallback — only used when no real DOE data is available
 * for a given station.
 */
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

router.get("/", async (req, res) => {
  const now = Date.now();

  // Fetch Overpass stations (cached 1hr)
  if (cachedStations.length === 0 || (now - lastFetched) >= CACHE_DURATION_MS) {
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
      if (data.elements) {
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

        if (stations.length > 0) {
          cachedStations = stations;
          lastFetched = now;
        }
      }
    } catch (error) {
      console.error("Error fetching from Overpass API:", error);
    }
  }

  // Fetch live DOE fuel prices (internally cached 6hrs)
  const fuelPrices = await getFuelPrices();
  const preferredGrade = (process.env.DOE_PREFERRED_GRADE ?? "ron91") as keyof typeof fuelPrices;

  // Attach real prices to each station
  const enriched = cachedStations.map((s: any) => {
    const primaryPrice =
      (fuelPrices[preferredGrade] ?? fuelPrices.ron91 ?? fuelPrices.diesel) ||
      getSeededPrice(parseInt(s.id, 10), s.brand);

    const gradeLabel = fuelPrices[preferredGrade]
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
        diesel: fuelPrices.diesel,
        ron91: fuelPrices.ron91,
        ron95: fuelPrices.ron95,
        ron97: fuelPrices.ron97,
      },
      coordinates: s.coordinates,
    };
  });

  res.json(enriched.length > 0 ? enriched : cachedStations);
});

export default router;
