import { Router } from "express";

const router = Router();

let cachedStations: any[] = [];
let lastFetched: number = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

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

const getSeededStatus = (osmId: number): string => {
  const hash = (osmId * 123456789) % 100;
  if (hash < 10) return "MAINTENANCE";
  if (hash < 30) return "PEAK_HOURS";
  return "OPERATIONAL";
};

router.get("/", async (req, res) => {
  const now = Date.now();
  if (cachedStations.length > 0 && (now - lastFetched) < CACHE_DURATION_MS) {
    res.json(cachedStations);
    return;
  }

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
          price: getSeededPrice(el.id, el.tags?.brand || el.tags?.name),
          status: getSeededStatus(el.id),
          coordinates: [lon, lat]
        };
      }).filter((s: any) => !isNaN(s.coordinates[0]) && !isNaN(s.coordinates[1]));

      if (stations.length > 0) {
        cachedStations = stations;
        lastFetched = now;
      }
    }

    res.json(cachedStations);
  } catch (error) {
    console.error("Error fetching from Overpass API:", error);
    // Return stale cache if available, otherwise empty array
    res.json(cachedStations);
  }
});

export default router;
