import { createSignal, onMount, type Component, onCleanup, For, createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { checkSession, getRole, isAuthenticated, apiGet } from "../api";
import { requestCookieConsent } from "../components/CookieConsent";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_THEMES, applyThemeStyle } from "../constants/mapThemes";

interface FuelData {
  diesel?: string;
  ron91?: string;
  ron95?: string;
  ron97?: string;
}

interface Station {
  id: string;
  name: string;
  brand?: string;
  preferredGrade?: string;
  price: string;
  priceGrade?: string;
  fuelData?: FuelData;
  coordinates: [number, number];
}

function fuelLabel(brand: string | undefined, grade: string): string {
  const b = brand?.toLowerCase() ?? "";
  const isCaltex = b.includes("caltex");
  const isPetron = b.includes("petron");
  const isPetroGazz = b.includes("petro gazz") || b.includes("petrogazz");
  const isTotal = b.includes("total");
  const isCleanfuel = b.includes("cleanfuel");
  const isPetrol = b.includes("petrol");
  const isPtt = b.includes("ptt");
  const isFlyingV = b.includes("flying v") || b.includes("flying_v");
  const isPlanetGas = b.includes("planet gas") || b.includes("planetgas");
  const isShell = b.includes("shell");
  if (isPetron) {
    switch (grade) {
      case "diesel": return "DIESEL MAX";
      case "ron91": return "XTRA ADVANCE";
      case "ron95": return "XCS";
      default: return grade.toUpperCase();
    }
  }
  if (isPetroGazz) {
    switch (grade) {
      case "diesel": return "DIESEL";
      case "ron91": return "UNLEADED";
      case "ron95": return "PREMIUM";
      default: return grade.toUpperCase();
    }
  }
  if (isTotal) {
    switch (grade) {
      case "diesel": return "DIESEL";
      case "ron91": return "PREMIER 91";
      case "ron95": return "EXCELLIUM 95";
      default: return grade.toUpperCase();
    }
  }
  if (isCleanfuel) {
    switch (grade) {
      case "diesel": return "DIESEL";
      case "ron91": return "CLEAN 91";
      case "ron95": return "PREMIUM 95";
      default: return grade.toUpperCase();
    }
  }
  if (isPetrol) {
    switch (grade) {
      case "diesel": return "DIESEL";
      case "ron91": return "ECO GREEN";
      case "ron95": return "MAX SUPER";
      default: return grade.toUpperCase();
    }
  }
  if (isPtt) {
    switch (grade) {
      case "diesel": return "SAVE+DIESEL";
      case "ron91": return "ECO+ GASOLINE";
      case "ron95": return "POWER+ GASOLINE";
      default: return grade.toUpperCase();
    }
  }
  if (isFlyingV) {
    switch (grade) {
      case "diesel": return "DECIVEL";
      case "ron91": return "VOLT";
      case "ron95": return "THUNDER";
      default: return grade.toUpperCase();
    }
  }
  if (isPlanetGas) {
    switch (grade) {
      case "diesel": return "DIESEL";
      case "ron91": return "UNLEADED";
      case "ron95": return "PREMIUM";
      default: return grade.toUpperCase();
    }
  }
  if (isShell) {
    switch (grade) {
      case "diesel": return "FUELSAVE DIESEL";
      case "ron91": return "FUELSAVE GASOLINE";
      case "ron95": return "V-POWER GASOLINE";
      case "ron97": return "V-POWER RACING";
      default: return grade.toUpperCase();
    }
  }
  if (isCaltex) {
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

const Landing: Component = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = createSignal(typeof window !== "undefined" ? window.scrollY : 0);
  let placeholderRef: HTMLDivElement | undefined;
  const [placeholderRect, setPlaceholderRect] = createSignal<{ top: number; left: number; width: number; height: number } | null>(null);
  const [manilaTime, setManilaTime] = createSignal("");

  createEffect(() => {
    const update = () => {
      const now = new Date();
      const manila = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      setManilaTime(manila.toLocaleTimeString("en-US", { hour12: false }));
    };
    update();
    const id = setInterval(update, 1000);
    onCleanup(() => clearInterval(id));
  });

  // Ease-out cubic: fast start, gentle deceleration into the navbar
  const octEased = (t: number) => 1 - Math.pow(1 - Math.min(t, 1), 3);

  // We animate over a scroll threshold of 220px for a quicker snap into the navbar
  const scrollThreshold = 220;
  const octProgress = () => octEased(scrollY() / scrollThreshold);

  const updateOffset = () => {
    if (placeholderRef) {
      const rect = placeholderRef.getBoundingClientRect();
      setPlaceholderRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    }
  };

  // Map state
  let mapContainer: HTMLDivElement | undefined;
  const [map, setMap] = createSignal<maplibregl.Map | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [syncTime, setSyncTime] = createSignal("");
  const [stations, setStations] = createSignal<Station[]>([]);

  // Live price ticker: grade averages across the stations currently on the map.
  // Only real fuel data counts — seeded estimate prices (~₱2) fall outside the
  // sanity range, and live elements hide entirely until live data arrives.
  const gradeAverages = () => {
    const list = stations();
    const avg = (pick: (f?: FuelData) => string | undefined): number | null => {
      const vals = list
        .map((s) => parseFloat(pick(s.fuelData) ?? ""))
        .filter((v) => !isNaN(v) && v >= 30 && v <= 150);
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    return {
      count: list.length,
      diesel: avg((f) => f?.diesel),
      ron91: avg((f) => f?.ron91),
      ron95: avg((f) => f?.ron95),
    };
  };
  const tickerItems = () => {
    const g = gradeAverages();
    if (g.count === 0) return [];
    const items: Array<{ label: string; value: string }> = [
      { label: "STATIONS LIVE", value: String(g.count) },
    ];
    if (g.diesel) items.push({ label: "DIESEL AVG", value: `₱${g.diesel.toFixed(2)}` });
    if (g.ron91) items.push({ label: "UNLEADED AVG", value: `₱${g.ron91.toFixed(2)}` });
    if (g.ron95) items.push({ label: "PREMIUM AVG", value: `₱${g.ron95.toFixed(2)}` });
    return items;
  };

  const updateSyncTime = () => {
    const now = new Date();
    const formatted = `SYNCED_${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    setSyncTime(formatted);
  };

  onMount(async () => {
    if (!isAuthenticated()) {
      await checkSession();
    }
    if (isAuthenticated()) {
      navigate(getRole() === "admin" ? "/admin" : "/dashboard", { replace: true });
      return;
    }

    const handleScroll = () => {
      // One update per animation frame: without this, a fast flick delivers
      // scroll positions faster than frames can paint and the wordmark jumps.
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        updateOffset();
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateOffset);
    window.addEventListener("load", updateOffset);

    // Initial offsets
    updateOffset();

    // Fire at multiple delays so the layout (including map card) is fully settled
    const timer1 = setTimeout(updateOffset, 100);
    const timer2 = setTimeout(updateOffset, 350);
    const timer3 = setTimeout(updateOffset, 700);

    const revealEls = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => observer.observe(el));

    // Initialize Map for Guest
    updateSyncTime();
    let mapInstance: maplibregl.Map | null = null;
    let markers: maplibregl.Marker[] = [];
    let ticking = false;

    const initMap = () => {
      if (!mapContainer) return;

      mapInstance = new maplibregl.Map({
        container: mapContainer,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [120.2824, 14.8386], // Zambales/Olongapo area center
        zoom: 12,
        attributionControl: false,
      });

      mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }));

      mapInstance.on("load", async () => {
        if (!mapInstance) return;
        // Resize after the DOM has painted so the canvas fills the container
        setTimeout(() => mapInstance?.resize(), 0);
        setMap(mapInstance);
        setLoading(false);
        applyThemeStyle(mapInstance, "DEFAULT");

        try {
          const res = await apiGet<Station[]>("/stations");
          console.log("[OCTANE] Landing stations fetch:", res);
          if (res.success && res.data && mapInstance) {
            console.log(`[OCTANE] Adding ${res.data.length} markers`);
            setStations(res.data);
            res.data.forEach((station) => {
              const el = document.createElement("div");
              el.id = `landing-marker-${station.id}`;
              // DO NOT add maplibregl-marker here — MapLibre adds that to its own wrapper
              el.style.cssText = "display:flex;align-items:center;justify-content:center;cursor:pointer;";
              el.innerHTML = `<span class="material-symbols-outlined" style="font-size:26px;color:#e0e0e0;filter:drop-shadow(0 0 4px #e0e0e040);font-variation-settings:'FILL' 1;">local_gas_station</span>`;

              const popup = new maplibregl.Popup({
                offset: [0, -12],
                closeButton: false,
                anchor: "bottom",
                className: "custom-telemetry-popup",
                maxWidth: "280px",
              }).setHTML(`
                <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#ffffff;text-transform:uppercase;">
                  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #262626;padding-bottom:6px;margin-bottom:6px;">
                    <span style="font-family:'Azonix',sans-serif;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:4px;">${station.name}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:4px;">
                    <span style="color:#cccccc;">PRICE (APPROX):</span>
                    <span style="color:#c3d9f3;font-size:13px;">~₱${station.price}</span>
                  </div>
                  ${station.fuelData ? `
                  <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:3px;font-size:9px;">
                    <span style="color:#999999;">${fuelLabel(station.brand, "diesel")}:</span>
                    <span style="color:#cccccc;">${station.fuelData.diesel ?? "—"}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:3px;font-size:9px;">
                    <span style="color:#999999;">${fuelLabel(station.brand, "ron91")}:</span>
                    <span style="color:#cccccc;">${station.fuelData.ron91 ?? "—"}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:3px;font-size:9px;">
                    <span style="color:#999999;">${fuelLabel(station.brand, "ron95")}:</span>
                    <span style="color:#cccccc;">${station.fuelData.ron95 ?? "—"}</span>
                  </div>
                  ${String(station.brand ?? "").toLowerCase().includes("shell") ? `
                  <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:3px;font-size:9px;">
                    <span style="color:#999999;">${fuelLabel(station.brand, "ron97")}:</span>
                    <span style="color:#cccccc;">${station.fuelData.ron97 ?? "—"}</span>
                  </div>` : ""}
                  ` : ""}
                  <div style="display:flex;justify-content:center;margin-top:6px;padding-top:6px;border-top:1px solid #262626;">
                    <button class="save-station-btn" style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#c3d9f3;background:none;border:none;cursor:pointer;" data-station-id="${station.id}">
                      SIGN IN TO SAVE
                    </button>
                  </div>
                </div>
              `);

              popup.on("open", () => {
                const popupEl = popup.getElement();
                const btn = popupEl?.querySelector(".save-station-btn");
                if (btn) {
                  btn.addEventListener("click", () => navigate("/auth"));
                }
              });

              const marker = new maplibregl.Marker({ element: el })
                .setLngLat(station.coordinates as [number, number])
                .setPopup(popup)
                .addTo(mapInstance!);

              markers.push(marker);
            });
          } else {
            console.warn("[OCTANE] No station data:", res.error);
          }
        } catch (err) {
          console.error("[OCTANE] Failed to load stations on landing map:", err);
        }
      });
    };

    // Resize MapLibre whenever the container element resizes
    let resizeObserver: ResizeObserver | null = null;
    if (mapContainer) {
      resizeObserver = new ResizeObserver(() => {
        mapInstance?.resize();
      });
      resizeObserver.observe(mapContainer);
    }

    // Delay init so the container has real pixel dimensions before MapLibre reads them
    const initTimer = setTimeout(initMap, 50);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateOffset);
      window.removeEventListener("load", updateOffset);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(initTimer);
      observer.disconnect();
      resizeObserver?.disconnect();
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  });

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div class="bg-black text-on-surface">
      {/* Landing Top Nav */}
      <header 
        classList={{
          "fixed top-0 left-0 w-full z-50 flex justify-between items-center px-container-margin transition-all duration-300": true,
          "bg-black/80 backdrop-blur-sm border-b border-hairline": scrollY() > 0,
          "bg-transparent border-b border-transparent": scrollY() === 0,
        }}
        style={{
          height: "calc(64px + env(safe-area-inset-top, 0px))",
          "padding-top": "env(safe-area-inset-top, 0px)",
        }}
      >
        <div class="flex items-center gap-xs">
          <span class="font-label-md text-label-md uppercase text-primary select-none tracking-[1px]">
            LIVE VIEW
          </span>
          <span class="font-label-sm text-[10px] text-text-muted select-none">
            [{manilaTime() || "00:00:00"} PH]
          </span>
        </div>
        <button
          onClick={() => navigate("/auth")}
          class="font-label-md text-label-md uppercase tracking-[2.5px] hover:opacity-60 transition-opacity"
        >
          SIGN IN
        </button>
      </header>

      {/* Floating Wordmark — outside flex container to prevent flex positioning quirks */}
      <div
        class="fixed pointer-events-none"
        style={{
          "font-family": "'Azonix', sans-serif",
          "font-weight": 400,
          color: "#ffffff",
          "text-transform": "uppercase",
          "white-space": "nowrap",
          "will-change": "transform, font-size",
          // Short easing so the glide survives coarse scroll delivery
          // (touch momentum, background tab): JS retargets every frame,
          // CSS bridges any gap between updates.
          transition: "transform 0.18s ease-out, font-size 0.18s ease-out, letter-spacing 0.18s ease-out",
          left: "0px",
          top: "0px",
          "font-size": `${48 - octProgress() * 28}px`,
          "letter-spacing": `${4 - octProgress() * 3}px`,
          opacity: `${1 - octProgress() * 0.15 + (octProgress() === 1 ? 0.15 : 0)}`,
          transform: `translate(${
            placeholderRect() 
              ? (placeholderRect()!.left + placeholderRect()!.width / 2 + (window.innerWidth / 2 - (placeholderRect()!.left + placeholderRect()!.width / 2)) * octProgress()) 
              : (window.innerWidth / 2)
          }px, ${
            placeholderRect() 
              ? (placeholderRect()!.top + placeholderRect()!.height / 2 + (32 - (placeholderRect()!.top + placeholderRect()!.height / 2)) * octProgress()) 
              : 300
          }px) translate(-50%, -50%)`,
          "z-index": 100,
        }}
      >
        OCTANE
      </div>

      {/* Hero */}
      <section id="live-map" class="relative w-full">
        {/* Parallax background — covers full hero height */}
        <div class="absolute inset-0 z-0 overflow-hidden" style={{ "min-height": "100vh" }}>
          <div
            class="w-full h-[120%] bg-cover bg-center opacity-60"
            style={{
              "background-image": "url('/ZAMBALES.png')",
              transform: `translateY(${scrollY() * 0.3}px)`,
            }}
          />
        </div>

        {/* Content — mobile: stacked column, desktop: side-by-side row */}
        <div class="relative z-10 flex flex-col md:flex-row">

          {/* LEFT — hero text: full-page height on mobile, half-screen on desktop. Always centered. */}
          <div class="min-h-screen md:h-screen md:flex-1 flex flex-col items-center justify-center text-center px-container-margin">
            <p class="font-label-md text-label-md text-text-muted uppercase mb-[8px] reveal">
              A LOCAL PASSION PROJECT
            </p>
            {/* Wordmark placeholder — centered, fixed width so the flying title anchors correctly */}
            <div ref={(el) => { placeholderRef = el; updateOffset(); }} class="h-[53px] mb-[8px] w-[280px]" />
            <p class="font-label-md text-label-md text-text-muted mb-lg uppercase reveal">
              Zambales Fuel Price Watchlist
            </p>
            <div class="reveal flex flex-col sm:flex-row items-center justify-center gap-sm">
              <button
                onClick={() => scrollTo("regional-intelligence")}
                class="px-lg py-sm font-label-md text-label-md text-text-muted uppercase tracking-[2.5px] hover:text-primary transition-colors cursor-pointer"
              >
                EXPLORE THE SYSTEM
              </button>
              <button
                onClick={() => navigate("/auth")}
                class="border border-primary px-lg py-sm font-label-md text-label-md text-primary uppercase tracking-[2.5px] rounded-full hover:bg-primary hover:text-black transition-all duration-300 active:scale-95 cursor-pointer"
              >
                SIGN IN
              </button>
            </div>
            {/* Scroll hint — mobile only, tells user to scroll down to see the map */}
            <div class="md:hidden mt-16 flex flex-col items-center gap-xs opacity-40 select-none">
              <span class="font-label-sm text-label-sm">SCROLL TO EXPLORE MAP</span>
              <span class="material-symbols-outlined animate-bounce">expand_more</span>
            </div>
          </div>

          {/* RIGHT — map card: fills the right half on desktop with top inset for nav */}
          <div class="w-full h-[80vh] px-container-margin md:px-0 md:w-[58%] md:h-screen md:flex-none md:flex md:items-center md:justify-start md:pr-container-margin reveal">
            <div class="w-full h-full md:h-[calc(100vh-140px)] bg-black border border-hairline flex flex-col">
              {/* Telemetry header */}
              <div class="flex-none px-md py-xs border-b border-hairline flex justify-between items-center bg-surface-soft select-none">
                <div class="flex items-center gap-xs">
                  <span class="w-1.5 h-1.5 bg-ice-blue rounded-full animate-pulse" />
                  <span class="font-label-sm text-[10px] text-primary uppercase tracking-[2px]">MAP_WIDGET: PUBLIC_FEED</span>
                </div>
                <span class="font-label-sm text-[9px] text-text-muted uppercase tracking-[1px]">{syncTime() || "LIVE_TELEMETRY"}{stations().length > 0 ? ` · ${stations().length} STATIONS` : ""}</span>
              </div>

              {/* Map — fills all remaining height in the card */}
              <div class="flex-1 relative overflow-hidden">
                <div class="absolute inset-0 z-0 bg-background">
                  <div
                    ref={mapContainer}
                    class="w-full h-full opacity-60 filter-monochrome-dark"
                  />
                </div>
                {loading() && (
                  <div class="absolute inset-0 bg-background/90 flex flex-col items-center justify-center z-10">
                    <div class="flex items-center gap-xs mb-sm">
                      <span class="w-1.5 h-1.5 bg-primary animate-ping" />
                      <span class="w-1.5 h-1.5 bg-primary animate-ping delay-75" />
                      <span class="w-1.5 h-1.5 bg-primary animate-ping delay-150" />
                    </div>
                    <span class="font-label-sm text-[10px] text-primary uppercase tracking-[2px] animate-pulse">
                      CONNECTING TO NODE GRID...
                    </span>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <div class="flex-none px-md py-[5px] bg-surface-soft border-t border-hairline text-center select-none">
                <span class="font-label-sm text-[7px] text-text-muted opacity-40 tracking-[1.5px] uppercase">
                  * GUEST VIEW — READ-ONLY. SIGN IN TO SAVE STATIONS.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live price ticker — real averages from the stations on the map above.
          Hidden until station data arrives. */}
      {tickerItems().length > 0 && (
        <div class="bg-black border-y border-hairline overflow-hidden select-none" aria-hidden="true">
          <div class="ticker-track flex w-max">
            {[0, 1].map(() => (
              <div class="flex items-center gap-xl px-md py-xs">
                {tickerItems().map((t) => (
                  <span class="flex items-center gap-xs font-label-sm text-[10px] uppercase tracking-[2px] whitespace-nowrap">
                    <span class="w-1.5 h-1.5 bg-ice-blue rounded-full animate-pulse" />
                    <span class="text-text-muted">{t.label}</span>
                    <span class="text-primary">{t.value}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* What you can do here — one strip, three things */}
      <section id="regional-intelligence" class="relative bg-black py-section-gap px-container-margin overflow-hidden">
        <div
          class="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(600px 300px at 80% 0%, rgba(195,217,243,0.07), transparent)" }}
          aria-hidden="true"
        />
        <div class="relative max-w-7xl mx-auto">
          <div class="mb-xl reveal">
            <span class="font-label-sm text-label-sm text-text-muted uppercase mb-xs block">WHAT YOU CAN DO HERE</span>
            <h2 class="font-headline-lg text-headline-lg text-primary uppercase mb-md">
              MADE FOR DRIVERS<br />IN ZAMBALES
            </h2>
            <p class="font-body-md text-body-md text-text-body">
              Check fuel prices before you leave the house, keep your regular
              stations in one list, and see how prices moved since last week.
              That's the whole app.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-sm reveal">
            {[
              {
                name: "CHECK BEFORE YOU GO",
                grade: "LIVE MAP · OLONGAPO + SUBIC",
                body: "Every station on the map shows an approximated price per grade, refreshed weekly. Tap any marker for the full breakdown.",
                action: "OPEN THE MAP",
                onAction: () => scrollTo("live-map"),
                liveBars: true,
              },
              {
                name: "SAVE YOUR REGULARS",
                grade: "WATCHLIST · FREE ACCOUNT",
                body: "Sign in and keep your usual stations in one list, instead of checking them one by one every time you drive out.",
                action: "CREATE WATCHLIST",
                onAction: () => navigate("/auth"),
                liveBars: false,
              },
              {
                name: "SEE THE MOVEMENT",
                grade: "THIS WEEK VS LAST",
                body: "Each saved station shows how its price moved since last week and last month — so you know whether to fill up now or wait.",
                action: "SIGN IN TO TRACK",
                onAction: () => navigate("/auth"),
                liveBars: false,
              },
            ].map((s) => (
              <div class="bg-surface-card p-md border-t border-hairline group hover:bg-surface-container transition-colors flex flex-col">
                <div class="flex justify-between items-start mb-lg">
                  <h3 class="font-headline-md text-headline-md text-primary uppercase">{s.name}</h3>
                  <span class="material-symbols-outlined text-text-muted group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                    north_east
                  </span>
                </div>
                <div class="mb-sm">
                  <span class="font-label-sm text-label-sm text-text-muted block">{s.grade}</span>
                </div>
                <p class="font-body-md text-body-md text-text-body mb-lg flex-1">
                  {s.body}
                </p>
                {s.liveBars && (
                  stations().length > 0 ? (
                    <GradeBars
                      grades={[
                        { label: "DIESEL", value: gradeAverages().diesel },
                        { label: "UNLEADED", value: gradeAverages().ron91 },
                        { label: "PREMIUM", value: gradeAverages().ron95 },
                      ]}
                    />
                  ) : (
                    <span class="font-label-sm text-[10px] text-text-muted uppercase tracking-[2px] mt-md animate-pulse">
                      LOADING LIVE DATA…
                    </span>
                  )
                )}
                <button
                  onClick={s.onAction}
                  class={`self-start font-label-md text-label-md uppercase underline underline-offset-8 decoration-hairline hover:decoration-white transition-all cursor-pointer ${s.liveBars ? "mt-lg" : ""}`}
                >
                  {s.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FaqSection />

      {/* Pre-footer Photo Band */}
      <section class="relative py-section-gap w-full flex items-center justify-center overflow-hidden">
        <div class="absolute inset-0 z-0">
          <div
            class="w-full h-full bg-cover bg-fixed bg-center opacity-40"
            style={{
              "background-image":
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAcmUqoxSXeKzCJ-edOmC6Opkaj2DqlzjeqS9z0oML2MoIdWFPyz4Z86irvzgTOGXs0IBN0bPdwtXyfhdyBmWVLQufPqyo_BC2vbEcjq80eBeOIDM_R4aoK9KlW0Wxj_qsm230SOX9s0Vgh2QSs0ZqH8_OTZDRmz1nz1QUlr6FHV2TLd-QPKHmr69MNyBBBBVFnBSDh8K-Y5YJCqPYbQWSsQ-MGqEQ2QHx-abyqTWk3umCNsdF13YlKeRTvCjfCM60ycyJ0g5K6g48')",
            }}
          ></div>
        </div>
        <div class="relative z-10 text-center px-container-margin py-xl max-w-3xl">
          <h2 class="font-headline-lg text-headline-lg text-primary uppercase mb-md reveal">
            ESTIMATES FROM WEEKLY DATA — NOT PUMP READINGS
          </h2>
          <div class="reveal">
            <button
              onClick={() => navigate("/auth")}
              class="border border-primary px-lg py-sm font-label-md text-label-md text-primary uppercase tracking-[2.5px] rounded-full hover:bg-primary hover:text-black transition-all duration-300 active:scale-95"
            >
              SIGN IN
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer class="bg-black pt-xl pb-md px-container-margin border-t border-hairline">
        <div class="max-w-7xl mx-auto flex flex-col gap-lg">
          <div class="flex justify-center overflow-hidden">
            <h2 class="font-headline-xl text-[120px] md:text-[200px] leading-none text-surface-container font-extrabold uppercase select-none pointer-events-none tracking-[-0.05em] opacity-30">
              OCTANE
            </h2>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-lg">
            <div class="col-span-2 md:col-span-1 flex flex-col gap-xs">
              <span class="font-headline-md text-headline-md text-primary uppercase tracking-[2px]">OCTANE</span>
              <span class="font-label-sm text-[10px] text-text-muted uppercase tracking-[1px] leading-relaxed">
                Zambales fuel price watchlist.<br />Estimates from weekly data.
              </span>
            </div>
            <div class="flex flex-col gap-xs">
              <span class="font-label-sm text-[10px] text-text-muted uppercase tracking-[2px] mb-xs opacity-60">EXPLORE</span>
              <button
                onClick={() => scrollTo("live-map")}
                class="font-label-md text-label-md text-text-muted hover:text-white transition-colors text-left cursor-pointer"
              >
                LIVE MAP
              </button>
              <button
                onClick={() => navigate("/auth")}
                class="font-label-md text-label-md text-text-muted hover:text-white transition-colors text-left cursor-pointer"
              >
                WATCHLIST
              </button>
              <button
                onClick={() => navigate("/auth")}
                class="font-label-md text-label-md text-text-muted hover:text-white transition-colors text-left cursor-pointer"
              >
                STATIONS
              </button>
            </div>
            <div class="flex flex-col gap-xs">
              <span class="font-label-sm text-[10px] text-text-muted uppercase tracking-[2px] mb-xs opacity-60">LEGAL</span>
              <button
                onClick={() => navigate("/privacy")}
                class="font-label-md text-label-md text-text-muted hover:text-white transition-colors text-left cursor-pointer"
              >
                PRIVACY POLICY
              </button>
              <button
                onClick={() => requestCookieConsent()}
                class="font-label-md text-label-md text-text-muted hover:text-white transition-colors text-left cursor-pointer"
              >
                COOKIE SETTINGS
              </button>
            </div>
            <div class="flex flex-col gap-xs">
              <span class="font-label-sm text-[10px] text-text-muted uppercase tracking-[2px] mb-xs opacity-60">CONTACT</span>
              <a
                href="mailto:soul.jsx@gmail.com"
                class="font-label-md text-label-md text-text-muted hover:text-white transition-colors w-fit"
              >
                soul.jsx@gmail.com
              </a>
              <span class="font-label-sm text-[10px] text-text-muted uppercase tracking-[1px]">
                DATA REFRESHED WEEKLY
              </span>
            </div>
          </div>
          <div class="pt-md flex flex-col md:flex-row justify-between items-center gap-xs border-t border-hairline font-label-sm text-[10px] text-text-muted uppercase tracking-[1px]">
            <span>© {new Date().getFullYear()} OCTANE</span>
            <span class="opacity-60">ALL PRICES APPROX · NOT PUMP READINGS</span>
            <span class="opacity-60">MADE BY SOUL.jsx</span>
          </div>
        </div>
      </footer>

      <style>{`
        .reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .ticker-track {
          animation: ticker-scroll 28s linear infinite;
        }
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none; }
        }
      `}</style>
    </div>
  );
};

// Live average-price bars. Widths are normalized to a fixed ₱60–₱110 domain
// so they stay comparable week to week; they animate in when data arrives.
const GradeBars: Component<{ grades: Array<{ label: string; value: number | null }> }> = (props) => {
  return (
    <div class="flex flex-col gap-sm mt-md">
      {props.grades.map((g) => (
        <div>
          <div class="flex justify-between items-baseline mb-xs">
            <span class="font-label-sm text-[10px] text-text-muted uppercase tracking-[2px]">{g.label}</span>
            <span class="font-data-lg text-[15px] text-primary">{g.value !== null ? `₱${g.value.toFixed(2)}` : "—"}</span>
          </div>
          <div class="h-[3px] bg-white/10 w-full">
            <div
              class="h-full bg-ice-blue transition-all duration-1000 ease-out"
              style={{ width: g.value !== null ? `${Math.min(100, Math.max(6, ((g.value - 60) / 50) * 100))}%` : "0%" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "Are these the actual pump prices?",
    a: "No. They're weekly estimates built from aggregated regional data — close enough to plan around, but always check the signboard before you fill up.",
  },
  {
    q: "Do I need an account?",
    a: "Not for the map — it's open to everyone. You only need one if you want to save stations to a watchlist.",
  },
  {
    q: "Which areas are covered?",
    a: "Olongapo City and Subic, Zambales. That's it for now — it's a local project.",
  },
  {
    q: "How often do prices update?",
    a: "The data refreshes weekly, and the app caches it for a day so pages stay fast.",
  },
  {
    q: "Who's behind this?",
    a: "SOUL.jsx — a local passion project. Questions or corrections: soul.jsx@gmail.com.",
  },
];

const FaqSection: Component = () => {
  const [open, setOpen] = createSignal<number | null>(0);
  return (
    <section class="bg-black py-section-gap px-container-margin">
      <div class="max-w-4xl mx-auto">
        <div class="mb-lg reveal">
          <span class="font-label-sm text-label-sm text-text-muted uppercase mb-xs block">STRAIGHT ANSWERS</span>
          <h2 class="font-headline-lg text-headline-lg text-primary uppercase">
            ASKED A LOT
          </h2>
        </div>
        <div class="reveal border-t border-hairline">
          {FAQ_ITEMS.map((item, i) => (
            <div class="border-b border-hairline">
              <button
                onClick={() => setOpen(open() === i ? null : i)}
                class="w-full flex justify-between items-center gap-md py-md text-left cursor-pointer group"
              >
                <span class="font-headline-md text-headline-md text-primary uppercase group-hover:opacity-70 transition-opacity">
                  {item.q}
                </span>
                <span
                  class="material-symbols-outlined text-text-muted shrink-0 transition-transform duration-300"
                  style={{ transform: open() === i ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  expand_more
                </span>
              </button>
              <div
                class="grid transition-all duration-300 ease-out"
                style={{
                  "grid-template-rows": open() === i ? "1fr" : "0fr",
                  opacity: open() === i ? "1" : "0",
                }}
              >
                <div class="overflow-hidden">
                  <p class="font-body-md text-body-md text-text-body pb-md pr-xl leading-relaxed">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Landing;
