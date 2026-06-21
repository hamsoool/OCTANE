import type { Component } from "solid-js";

const stations = [
  { name: "ARAL PULSE", grade: "SUPER 95", dist: "4.2 KM", price: "1.789", delta: null, time: "2M AGO" },
  { name: "SHELL V-POWER", grade: "SUPER 95", dist: "1.8 KM", price: "1.929", delta: null, time: "15M AGO" },
  { name: "ESSO EXPRESS", grade: "SUPER 95", dist: "6.5 KM", price: "1.749", delta: "down", time: "1H AGO" },
  { name: "JET AUTOMAT", grade: "SUPER 95", dist: "0.9 KM", price: "1.809", delta: null, time: "8M AGO" },
];

const Watchlist: Component = () => {
  return (
    <div class="px-container-margin py-lg max-w-screen-md mx-auto">
      {/* Header */}
      <section class="mb-lg">
        <h1 class="font-headline-lg text-headline-lg text-primary uppercase mb-xs">WATCHLIST</h1>
        <p class="font-label-sm text-label-sm text-text-muted uppercase">REAL-TIME DATA FEED // 4 STATIONS ACTIVE</p>
      </section>

      {/* Stats Grid */}
      <div class="grid grid-cols-2 gap-px bg-hairline mb-section-gap border border-hairline">
        <div class="bg-surface p-md">
          <div class="font-label-sm text-label-sm text-text-muted uppercase mb-unit">AVG PRICE</div>
          <div class="font-data-lg text-data-lg text-primary">1.849<span class="text-[12px] opacity-50 ml-1">EUR</span></div>
        </div>
        <div class="bg-surface p-md">
          <div class="font-label-sm text-label-sm text-text-muted uppercase mb-unit">DELTA 24H</div>
          <div class="font-data-lg text-data-lg text-ice-blue">-0.042</div>
        </div>
      </div>

      {/* Watchlist Feed */}
      <div class="flex flex-col">
        {stations.map((s) => (
          <>
            <div class="py-md flex justify-between items-center group cursor-pointer hover:bg-surface-soft transition-colors duration-200">
              <div class="flex flex-col gap-unit">
                <div class="font-headline-md text-headline-md text-primary uppercase leading-tight group-hover:translate-x-1 transition-transform">
                  {s.name}
                </div>
                <div class="flex gap-sm items-center">
                  <span class="font-label-sm text-label-sm text-text-muted uppercase border border-hairline px-2 py-0.5">{s.grade}</span>
                  <span class="font-label-sm text-label-sm text-text-muted">{s.dist}</span>
                </div>
              </div>
              <div class="text-right">
                <div
                  classList={{
                    "font-data-lg text-data-lg mb-unit": true,
                    "text-ice-blue": s.delta === "down",
                    "text-primary": s.delta !== "down",
                  }}
                >
                  {s.price}
                </div>
                <div class="font-label-sm text-label-sm text-text-muted uppercase">UPDATED {s.time}</div>
              </div>
            </div>
            <div class="h-px bg-hairline w-full"></div>
          </>
        ))}
      </div>

      {/* Action Section */}
      <div class="mt-section-gap flex flex-col items-center gap-md">
        <button class="w-full md:w-auto px-lg h-12 rounded-full border border-primary bg-transparent text-primary font-label-md text-label-md uppercase tracking-[2.5px] hover:bg-primary hover:text-background transition-all active:scale-95">
          ADD NEW STATION
        </button>
        <button class="w-full md:w-auto font-label-sm text-label-sm text-text-muted uppercase tracking-[2px] hover:text-primary transition-colors">
          EXPORT TELEMETRY DATA (.CSV)
        </button>
      </div>
    </div>
  );
};

export default Watchlist;
