import { createSignal, onMount, For, type Component } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { apiGet, apiDelete } from "../api";

interface SavedStation {
  _id: string;
  stationId: string;
  name: string;
  brand?: string;
  coordinates: [number, number];
  preferredGrade?: string;
  price: string;
  priceGrade?: string;
  fuelData?: {
    diesel?: string;
    ron91?: string;
    ron95?: string;
    ron97?: string;
  };
  savedAt: string;
}

function fuelLabel(brand: string | undefined, grade: string): string {
  const b = brand?.toLowerCase() ?? "";
  if (b.includes("petron")) {
    switch (grade) {
      case "diesel": return "DIESEL MAX";
      case "ron91": return "XTRA ADVANCE";
      case "ron95": return "XCS";
      default: return grade.toUpperCase();
    }
  }
  if (b.includes("petro gazz") || b.includes("petrogazz")) {
    switch (grade) {
      case "diesel": return "DIESEL";
      case "ron91": return "UNLEADED";
      case "ron95": return "PREMIUM";
      default: return grade.toUpperCase();
    }
  }
  if (b.includes("total")) {
    switch (grade) {
      case "diesel": return "DIESEL";
      case "ron91": return "PREMIER 91";
      case "ron95": return "EXCELLIUM 95";
      default: return grade.toUpperCase();
    }
  }
  if (b.includes("cleanfuel")) {
    switch (grade) {
      case "diesel": return "DIESEL";
      case "ron91": return "CLEAN 91";
      case "ron95": return "PREMIUM 95";
      default: return grade.toUpperCase();
    }
  }
  if (b.includes("petrol")) {
    switch (grade) {
      case "diesel": return "DIESEL";
      case "ron91": return "ECO GREEN";
      case "ron95": return "MAX SUPER";
      default: return grade.toUpperCase();
    }
  }
  if (b.includes("ptt")) {
    switch (grade) {
      case "diesel": return "SAVE+DIESEL";
      case "ron91": return "ECO+ GASOLINE";
      case "ron95": return "POWER+ GASOLINE";
      default: return grade.toUpperCase();
    }
  }
  if (b.includes("flying v") || b.includes("flying_v")) {
    switch (grade) {
      case "diesel": return "DECIVEL";
      case "ron91": return "VOLT";
      case "ron95": return "THUNDER";
      default: return grade.toUpperCase();
    }
  }
  if (b.includes("planet gas") || b.includes("planetgas")) {
    switch (grade) {
      case "diesel": return "DIESEL";
      case "ron91": return "UNLEADED";
      case "ron95": return "PREMIUM";
      default: return grade.toUpperCase();
    }
  }
  if (b.includes("shell")) {
    switch (grade) {
      case "diesel": return "FUELSAVE DIESEL";
      case "ron91": return "FUELSAVE GASOLINE";
      case "ron95": return "V-POWER GASOLINE";
      case "ron97": return "V-POWER RACING";
      default: return grade.toUpperCase();
    }
  }
  if (b.includes("caltex")) {
    switch (grade) {
      case "diesel": return "DIESEL";
      case "ron91": return "SILVER";
      case "ron95": return "PLATINUM";
      default: return grade.toUpperCase();
    }
  }
  switch (grade) {
    case "diesel": return "DIESEL";
    case "ron91": return "UNLEADED";
    case "ron95": return "PREMIUM";
    default: return grade.toUpperCase();
  }
}

const Stations: Component = () => {
  const navigate = useNavigate();
  const [stations, setStations] = createSignal<SavedStation[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const fetchSaved = async () => {
    setLoading(true);
    setError(null);
    const res = await apiGet<SavedStation[]>("/saved-stations");
    if (res.success && res.data) {
      setStations(res.data);
    } else {
      setError(res.error ?? "Failed to load saved stations.");
    }
    setLoading(false);
  };

  onMount(fetchSaved);

  const handleNavigate = (coords: [number, number]) => {
    navigate(`/map?lat=${coords[1]}&lon=${coords[0]}`);
  };

  const handleUnsave = async (stationId: string) => {
    const res = await apiDelete(`/saved-stations/${stationId}`);
    if (res.success) {
      setStations((prev) => prev.filter((s) => s.stationId !== stationId));
    }
  };

  const getAverage = (grade: "diesel" | "ron91" | "ron95") => {
    const activeStations = stations().filter(
      (s) => s.fuelData && s.fuelData[grade] && !isNaN(parseFloat(s.fuelData[grade]!))
    );
    if (activeStations.length === 0) return null;
    const sum = activeStations.reduce((acc, s) => acc + parseFloat(s.fuelData![grade]!), 0);
    return (sum / activeStations.length).toFixed(2);
  };

  return (
    <div class="px-container-margin py-lg max-w-screen-2xl mx-auto">
      <section class="mb-lg">
        <h1 class="font-headline-lg text-headline-lg text-primary uppercase mb-xs">SAVED STATIONS</h1>
        <p class="font-label-sm text-label-sm text-text-muted uppercase">
          {loading() ? "LOADING..." : `${stations().length} STATION${stations().length !== 1 ? "S" : ""} SAVED`}
        </p>
      </section>

      {loading() ? (
        <div class="flex flex-col items-center justify-center py-xl text-center">
          <span class="material-symbols-outlined text-text-muted text-lg mb-xs animate-spin">sync</span>
          <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">LOADING_SAVED...</span>
        </div>
      ) : error() ? (
        <div class="flex flex-col items-center justify-center py-xl text-center">
          <span class="material-symbols-outlined text-text-muted text-lg mb-xs">sensors_off</span>
          <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">CONNECTION_FAILED</span>
          <span class="font-label-sm text-[9px] text-text-muted opacity-80 uppercase tracking-[1px] mt-xs">{error()}</span>
          <button
            onClick={fetchSaved}
            class="mt-md font-label-sm text-label-sm text-ice-blue uppercase tracking-[2px] hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
            type="button"
          >
            [RETRY]
          </button>
        </div>
      ) : stations().length === 0 ? (
        <div class="flex flex-col items-center justify-center py-xl text-center">
          <span class="material-symbols-outlined text-text-muted text-lg mb-xs">bookmark_border</span>
          <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">NO_SAVED_STATIONS</span>
          <span class="font-label-sm text-[9px] text-text-muted opacity-40 uppercase tracking-[1px] mt-xs">
            SAVE STATIONS FROM THE{" "}
            <A href="/map" class="text-ice-blue underline">MAP</A> TO TRACK THEM HERE
          </span>
        </div>
      ) : (
        <>
          {/* Average Cards Grid */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-md mb-xl">
            {/* Diesel Card */}
            <div class="border border-hairline p-md bg-surface-card flex flex-col justify-between min-h-[110px]">
              <div class="flex items-baseline">
                <span class="font-data-lg text-[36px] md:text-[48px] text-primary leading-none">
                  {getAverage("diesel") ? `₱${getAverage("diesel")}` : "—"}
                </span>
              </div>
              <div>
                <span class="font-label-sm text-[10px] text-text-muted uppercase tracking-[2px]">AVG. DIESEL</span>
              </div>
            </div>

            {/* RON 91 Card */}
            <div class="border border-hairline p-md bg-surface-card flex flex-col justify-between min-h-[110px]">
              <div class="flex items-baseline">
                <span class="font-data-lg text-[36px] md:text-[48px] text-primary leading-none">
                  {getAverage("ron91") ? `₱${getAverage("ron91")}` : "—"}
                </span>
              </div>
              <div>
                <span class="font-label-sm text-[10px] text-text-muted uppercase tracking-[2px]">AVG. UNLEADED</span>
              </div>
            </div>

            {/* RON 95 Card */}
            <div class="border border-hairline p-md bg-surface-card flex flex-col justify-between min-h-[110px]">
              <div class="flex items-baseline">
                <span class="font-data-lg text-[36px] md:text-[48px] text-primary leading-none">
                  {getAverage("ron95") ? `₱${getAverage("ron95")}` : "—"}
                </span>
              </div>
              <div>
                <span class="font-label-sm text-[10px] text-text-muted uppercase tracking-[2px]">AVG. PREMIUM</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col">
            <For each={stations()}>
            {(s) => (
              <>
                <div class="py-md group hover:bg-surface-soft transition-colors">
                  <div class="flex flex-col md:flex-row md:items-center justify-between gap-md">
                    <div class="min-w-0 md:flex-1 md:basis-0">
                      <h2 class="font-headline-md text-headline-lg md:text-headline-xl text-primary uppercase tracking-[2px] leading-tight truncate">
                        {s.name}
                      </h2>
                      <span class="font-label-sm text-[10px] text-text-muted opacity-40 uppercase">
                        {new Date(s.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <div class="hidden md:flex justify-center items-center shrink-0 md:flex-1 md:basis-0">
                      {s.fuelData && (
                        <div class="flex items-center gap-xl">
                          {s.fuelData.diesel && (
                            <span class="font-data-lg text-[14px] text-primary uppercase whitespace-nowrap">
                              {fuelLabel(s.brand, "diesel")}: <span class="text-text-body">{s.fuelData.diesel}</span>
                            </span>
                          )}
                          {s.fuelData.ron91 && (
                            <span class="font-data-lg text-[14px] text-primary uppercase whitespace-nowrap">
                              {fuelLabel(s.brand, "ron91")}: <span class="text-text-body">{s.fuelData.ron91}</span>
                            </span>
                          )}
                          {s.fuelData.ron95 && (
                            <span class="font-data-lg text-[14px] text-primary uppercase whitespace-nowrap">
                              {fuelLabel(s.brand, "ron95")}: <span class="text-text-body">{s.fuelData.ron95}</span>
                            </span>
                          )}
                          {s.fuelData.ron97 && s.brand?.toLowerCase().includes("shell") && (
                            <span class="font-data-lg text-[14px] text-primary uppercase whitespace-nowrap">
                              {fuelLabel(s.brand, "ron97")}: <span class="text-text-body">{s.fuelData.ron97}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div class="flex items-center gap-lg shrink-0 md:flex-1 md:basis-0 md:justify-end">
                      <div class="text-right">
                        <div class="font-label-sm text-[11px] text-text-muted uppercase mb-unit">
                          {fuelLabel(s.brand, s.preferredGrade ?? "ron91")} (APPROX)
                        </div>
                        <span class="font-data-lg text-[20px] md:text-[24px] text-primary">₱{s.price}</span>
                      </div>
                      <div class="flex items-center gap-sm">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUnsave(s.stationId); }}
                          class="flex items-center justify-center w-8 h-8 border border-hairline text-text-muted hover:text-primary hover:border-primary transition-colors cursor-pointer focus:outline-none"
                          type="button"
                          aria-label="Unsave station"
                        >
                          <span class="material-symbols-outlined text-sm" style={{ "font-variation-settings": "'FILL' 0" }}>bookmark_remove</span>
                        </button>
                        <button
                          onClick={() => handleNavigate(s.coordinates)}
                          class="hidden md:flex items-center gap-xs px-sm py-xs border border-primary font-label-sm text-label-sm text-primary uppercase tracking-[2px] hover:bg-primary hover:text-background transition-all focus:outline-none"
                          type="button"
                        >
                          <span class="material-symbols-outlined text-sm">navigation</span>
                          NAVIGATE
                        </button>
                      </div>
                    </div>
                  </div>
                  {s.fuelData && (
                    <div class="flex items-center gap-x-xl gap-y-xs mt-sm md:hidden">
                      {s.fuelData.diesel && (
                        <span class="font-data-lg text-[14px] text-primary uppercase whitespace-nowrap">
                          {fuelLabel(s.brand, "diesel")}: <span class="text-text-body">{s.fuelData.diesel}</span>
                        </span>
                      )}
                      {s.fuelData.ron91 && (
                        <span class="font-data-lg text-[14px] text-primary uppercase whitespace-nowrap">
                          {fuelLabel(s.brand, "ron91")}: <span class="text-text-body">{s.fuelData.ron91}</span>
                        </span>
                      )}
                      {s.fuelData.ron95 && (
                        <span class="font-data-lg text-[14px] text-primary uppercase whitespace-nowrap">
                          {fuelLabel(s.brand, "ron95")}: <span class="text-text-body">{s.fuelData.ron95}</span>
                        </span>
                      )}
                      {s.fuelData.ron97 && s.brand?.toLowerCase().includes("shell") && (
                        <span class="font-data-lg text-[14px] text-primary uppercase whitespace-nowrap">
                          {fuelLabel(s.brand, "ron97")}: <span class="text-text-body">{s.fuelData.ron97}</span>
                        </span>
                      )}
                    </div>
                  )}
                  <div class="flex items-center gap-sm md:hidden mt-sm">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUnsave(s.stationId); }}
                      class="flex items-center justify-center w-8 h-8 border border-hairline text-text-muted hover:text-primary hover:border-primary transition-colors cursor-pointer focus:outline-none"
                      type="button"
                      aria-label="Unsave station"
                    >
                      <span class="material-symbols-outlined text-sm" style={{ "font-variation-settings": "'FILL' 0" }}>bookmark_remove</span>
                    </button>
                    <button
                      onClick={() => handleNavigate(s.coordinates)}
                      class="flex items-center gap-xs font-label-sm text-label-sm text-primary uppercase tracking-[2px] hover:opacity-80 transition-opacity focus:outline-none"
                      type="button"
                    >
                      <span class="material-symbols-outlined text-sm">navigation</span>
                      NAVIGATE
                    </button>
                  </div>
                </div>
                <div class="h-px bg-hairline w-full"></div>
              </>
            )}
          </For>
        </div>
      </>
    )}

      {!loading() && stations().length > 0 && (
        <footer class="mt-section-gap flex flex-col gap-md opacity-30 select-none">
          <div class="h-px w-full bg-hairline"></div>
          <div class="flex justify-end font-label-sm text-label-sm">
            <div class="text-right">
              <div class="text-primary mb-xs">LAST_SYNC</div>
              <div>{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} UTC</div>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
};

export default Stations;
