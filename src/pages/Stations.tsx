import type { Component } from "solid-js";

const stations = [
  {
    id: "MUN-492",
    name: "VANTAGE CORE TERMINAL",
    premium: "1.94",
    ultra: "2.12",
    premiumDelta: -0.04,
    ultraDelta: 0,
    status: "OPTIMAL",
    grade: "PREMIUM",
  },
  {
    id: "MUN-103",
    name: "SHELL V-POWER RING",
    premium: "1.89",
    ultra: "2.05",
    premiumDelta: -0.02,
    ultraDelta: 0.01,
    status: "OPTIMAL",
    grade: "PREMIUM",
  },
  {
    id: "MUN-227",
    name: "ARAL ULTIMATE EAST",
    premium: "1.92",
    ultra: "2.08",
    premiumDelta: 0,
    ultraDelta: -0.01,
    status: "HIGH_VOLUME",
    grade: "PREMIUM",
  },
  {
    id: "MUN-871",
    name: "TOTAL EXCELLIUM WEST",
    premium: "1.83",
    ultra: "2.01",
    premiumDelta: -0.06,
    ultraDelta: -0.03,
    status: "OPTIMAL",
    grade: "PREMIUM",
  },
  {
    id: "MUN-334",
    name: "ESSO SYNERGY SOUTH",
    premium: "1.96",
    ultra: "2.15",
    premiumDelta: 0.02,
    ultraDelta: 0.03,
    status: "MAINTENANCE",
    grade: "PREMIUM",
  },
];

const Stations: Component = () => {
  return (
    <div class="px-container-margin py-lg max-w-screen-xl mx-auto">
      {/* Header */}
      <section class="mb-lg">
        <h1 class="font-headline-lg text-headline-lg text-primary uppercase mb-xs">STATION TERMINALS</h1>
        <p class="font-label-sm text-label-sm text-text-muted uppercase">MUNICH METRO // 5 ACTIVE UNITS</p>
      </section>

      {/* Stats Summary */}
      <div class="grid grid-cols-3 gap-px bg-hairline border border-hairline mb-section-gap">
        <div class="bg-surface p-md">
          <div class="font-label-sm text-label-sm text-text-muted uppercase mb-unit">AVG PREMIUM</div>
          <div class="font-data-lg text-data-lg text-primary">1.908</div>
        </div>
        <div class="bg-surface p-md">
          <div class="font-label-sm text-label-sm text-text-muted uppercase mb-unit">AVG ULTRA-X</div>
          <div class="font-data-lg text-data-lg text-primary">2.082</div>
        </div>
        <div class="bg-surface p-md">
          <div class="font-label-sm text-label-sm text-text-muted uppercase mb-unit">FLEET DISCOUNT</div>
          <div class="font-data-lg text-data-lg text-ice-blue">-0.032</div>
        </div>
      </div>

      {/* Station List */}
      <div class="flex flex-col">
        {stations.map((s) => (
          <>
            <div class="py-md flex flex-col md:flex-row md:items-center justify-between gap-md group cursor-pointer hover:bg-surface-soft transition-colors">
              <div class="flex-1">
                <div class="flex items-center gap-sm mb-xs">
                  <span class="font-label-sm text-label-sm text-text-muted uppercase">{s.id}</span>
                  <span
                    classList={{
                      "font-label-sm text-label-sm uppercase px-1.5 py-0.5": true,
                      "bg-secondary-container text-secondary": s.status === "OPTIMAL",
                      "bg-surface-container-high text-text-muted": s.status === "HIGH_VOLUME",
                      "bg-surface-container text-text-muted": s.status === "MAINTENANCE",
                    }}
                  >
                    {s.status}
                  </span>
                </div>
                <h2 class="font-headline-md text-headline-md text-primary uppercase tracking-[2px] leading-tight">
                  {s.name}
                </h2>
              </div>
              <div class="flex items-center gap-lg">
                <div class="text-right">
                  <div class="font-label-sm text-label-sm text-text-muted uppercase mb-unit">PREMIUM</div>
                  <div class="flex items-center gap-xs">
                    <span class="font-data-lg text-data-lg text-primary">{s.premium}</span>
                    <span class="font-label-sm text-label-sm text-ice-blue">
                      {s.premiumDelta < 0 ? `${s.premiumDelta}` : s.premiumDelta > 0 ? `+${s.premiumDelta}` : "±0"}
                    </span>
                  </div>
                </div>
                <div class="text-right">
                  <div class="font-label-sm text-label-sm text-text-muted uppercase mb-unit">ULTRA-X</div>
                  <div class="flex items-center gap-xs">
                    <span class="font-data-lg text-data-lg text-primary">{s.ultra}</span>
                    <span class="font-label-sm text-label-sm text-text-muted">
                      {s.ultraDelta < 0 ? `${s.ultraDelta}` : s.ultraDelta > 0 ? `+${s.ultraDelta}` : "±0"}
                    </span>
                  </div>
                </div>
                <button class="hidden md:block px-sm py-xs border border-primary rounded-full font-label-md text-label-md text-primary uppercase tracking-[2.5px] hover:bg-primary hover:text-background transition-all active:scale-95">
                  NAVIGATE
                </button>
              </div>
            </div>
            <div class="h-px bg-hairline w-full"></div>
          </>
        ))}
      </div>

      {/* Geographic Metadata */}
      <footer class="mt-section-gap flex flex-col gap-md opacity-30 select-none">
        <div class="h-px w-full bg-hairline"></div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-lg font-label-sm text-label-sm">
          <div>
            <div class="text-primary mb-xs">LAT_REGION</div>
            <div>48.1351° N</div>
          </div>
          <div>
            <div class="text-primary mb-xs">LONG_REGION</div>
            <div>11.5820° E</div>
          </div>
          <div>
            <div class="text-primary mb-xs">DATA_SOURCE</div>
            <div>MTS-K ENGINE</div>
          </div>
          <div>
            <div class="text-primary mb-xs">LAST_SYNC</div>
            <div>14:22:01 UTC</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Stations;
