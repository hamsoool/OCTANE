/**
 * fuelPrices.ts
 *
 * Fetches and parses the latest North Luzon Pump Prices from the soul-scraper
 * DOE PDF Aggregator API. Uses the COMMON PRICE column extracted from the PDF
 * text to produce per-grade prices representative of the Region III area.
 *
 * Cache TTL: 6 hours (free-tier Render cold-start friendly)
 */

interface FuelGradePrices {
  ron91?: string;
  ron95?: string;
  ron97?: string;
  diesel?: string;
}

interface CacheEntry {
  prices: FuelGradePrices;
  fetchedAt: number;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
let cache: CacheEntry | null = null;

const DOE_API_URL =
  process.env.DOE_API_URL ?? "https://soul-scaper.onrender.com";

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
 * Fetches the latest North Luzon Pump Prices document from soul-scraper
 * and parses common fuel prices per grade.
 * Now that soul-scraper correctly filters by PDF URL date, only current-month
 * documents reach the DB, so the first parseable result is current data.
 * Results are cached for 6 hours.
 */
export async function getFuelPrices(): Promise<FuelGradePrices> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.prices;
  }

  try {
    const listRes = await fetch(
      `${DOE_API_URL}/documents?category=North%20Luzon%20Pump%20Prices&limit=20`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!listRes.ok) {
      throw new Error(`soul-scraper list fetch failed: ${listRes.status}`);
    }

    const docs: Array<{ id: number; title: string }> = await listRes.json();

    for (const doc of docs) {
      try {
        const detailRes = await fetch(`${DOE_API_URL}/documents/${doc.id}`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!detailRes.ok) continue;

        const detail: { content?: string } = await detailRes.json();
        const content = detail.content?.trim() ?? "";

        if (content.length < 50) continue; // Skip empty/near-empty documents

        const parsed = parseFuelContent(content);

        if (parsed.diesel || parsed.ron91) {
          cache = { prices: parsed, fetchedAt: now };
          console.log(
            `[fuelPrices] Loaded prices from doc ${doc.id} "${doc.title}": ${JSON.stringify(parsed)}`
          );
          return parsed;
        }
      } catch (innerErr) {
        console.warn(`[fuelPrices] Failed to fetch doc ${doc.id}:`, innerErr);
      }
    }

    throw new Error("No parseable North Luzon fuel price documents found");
  } catch (err) {
    console.error("[fuelPrices] Failed to fetch fuel prices:", err);
    if (cache) {
      console.warn("[fuelPrices] Returning stale cached prices.");
      return cache.prices;
    }
    return {};
  }
}
