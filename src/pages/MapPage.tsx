import { Component, createSignal, onMount, onCleanup, For, createEffect, untrack } from "solid-js";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_THEMES, applyThemeStyle, toggleMapLayerVisibility } from "../constants/mapThemes";
import { apiGet } from "../api";

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
  dist: string;
  coordinates: [number, number]; // [lng, lat]
}

type Suggestion =
  | { type: "station"; station: Station; matchName: string }
  | { type: "location"; name: string; lat: number; lon: number };

const DEFAULT_LOCATION = {
  name: "Olongapo City, Zambales, Philippines",
  lng: 120.2824,
  lat: 14.8386,
  zoom: 12,
};

const initialStations: Station[] = [
  { id: "aral", name: "ARAL_ULTIMATE", brand: "aral", preferredGrade: "ron91", price: "1.849", dist: "0.8 KM", coordinates: [120.2924, 14.8436] },
  { id: "shell", name: "SHELL_V-POWER", brand: "shell", preferredGrade: "ron91", price: "1.899", dist: "1.2 KM", coordinates: [120.2702, 14.8306] },
  { id: "jet", name: "JET_STATION", brand: "jet", preferredGrade: "ron91", price: "1.789", dist: "2.5 KM", coordinates: [120.3002, 14.8236] },
  { id: "esso", name: "ESSO_SYNERGY", brand: "esso", preferredGrade: "ron91", price: "1.829", dist: "3.1 KM", coordinates: [120.2602, 14.8506] },
];

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


const MapPage: Component = () => {
  let mapContainer: HTMLDivElement | undefined;
  const [map, setMap] = createSignal<maplibregl.Map | null>(null);
  const [selectedStationId, setSelectedStationId] = createSignal<string | null>(null);
  const [showMobileResults, setShowMobileResults] = createSignal<boolean>(true);
  const [searchQuery, setSearchQuery] = createSignal<string>("");
  const [isSearching, setIsSearching] = createSignal<boolean>(false);
  const [isMapInitializing, setIsMapInitializing] = createSignal<boolean>(true);
  const [allStations, setAllStations] = createSignal<Station[]>(initialStations);
  
  // Theme signals
  const [selectedTheme, setSelectedTheme] = createSignal<string>(
    localStorage.getItem("octane-map-theme") || "DEFAULT"
  );
  const [showThemePanel, setShowThemePanel] = createSignal<boolean>(false);

  // Load layer visibility settings from local storage
  const getInitialVisibility = () => {
    const saved = localStorage.getItem("octane-layer-visibility");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback to defaults
      }
    }
    return {
      landcover: true,
      buildings: true,
      water: true,
      parks: true,
      roads: true,
      rail: true,
      aeroway: true,
    };
  };

  const [layerVisibility, setLayerVisibility] = createSignal<Record<string, boolean>>(getInitialVisibility());

  // Dynamic Map Center state for distance calculations
  const [mapCenter, setMapCenter] = createSignal<[number, number]>([DEFAULT_LOCATION.lng, DEFAULT_LOCATION.lat]);
  
  // Geocoding signals
  const [suggestions, setSuggestions] = createSignal<Suggestion[]>([]);
  const [statusMessage, setStatusMessage] = createSignal<string>("");

  const [syncTime, setSyncTime] = createSignal<string>("");
  const [stationsLoading, setStationsLoading] = createSignal<boolean>(true);
  const [stationsError, setStationsError] = createSignal<string | null>(null);

  // User origin signals
  const [userLocation, setUserLocation] = createSignal<[number, number] | null>(null);
  const [userLocationMode, setUserLocationMode] = createSignal<"gps" | "pin" | null>(null);
  const [isPinMode, setIsPinMode] = createSignal<boolean>(false);
  const [showRoute, setShowRoute] = createSignal<boolean>(false);
  const [isFetchingRoute, setIsFetchingRoute] = createSignal<boolean>(false);
  const [routeError, setRouteError] = createSignal<string | null>(null);

  // OSRM road distance cache
  const [roadDistances, setRoadDistances] = createSignal<Record<string, number>>({});
  const [isRouting, setIsRouting] = createSignal<boolean>(false);

  const fetchRoadDistances = async (origin: [number, number], stations: Station[]) => {
    if (stations.length === 0) return;
    setIsRouting(true);
    setRoadDistances({});
    try {
      const coords = `${origin[0]},${origin[1]}`;
      const stationCoords = stations.map((s) => `${s.coordinates[0]},${s.coordinates[1]}`).join(";");
      const destIndices = stations.map((_, i) => i + 1).join(";");
      const url = `https://router.project-osrm.org/table/v1/driving/${coords};${stationCoords}?sources=0&destinations=${destIndices}&annotations=distance`;
      const response = await fetch(url, {
        headers: { "User-Agent": "octane-fuel-intelligence-client" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`OSRM error ${response.status}`);
      const data = await response.json();
      if (data.code === "Ok" && data.distances?.[0]) {
        const distances: Record<string, number> = {};
        stations.forEach((station, i) => {
          const meters = data.distances[0][i];
          if (meters != null && !isNaN(meters) && meters > 0) {
            distances[station.id] = meters / 1000;
          }
        });
        setRoadDistances(distances);
      }
    } catch (err) {
      console.error("OSRM road distance fetch failed, using haversine fallback:", err);
    } finally {
      setIsRouting(false);
    }
  };

  const updateSyncTime = () => {
    const now = new Date();
    const formatted = `SYNCED_${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    setSyncTime(formatted);
  };

  const fetchOverpassStations = async () => {
    setStationsLoading(true);
    setStationsError(null);
    try {
      const result = await apiGet<Station[]>("/stations");
      if (result.success && result.data) {
        setAllStations(result.data);
        setStationsError(null);
      } else {
        setStationsError(result.error || "Failed to fetch stations");
      }
    } catch (error) {
      console.error("Failed to fetch fuel stations from backend:", error);
      setStationsError("Unable to reach the system. Check your connection.");
    } finally {
      setStationsLoading(false);
    }
  };

  let markers: maplibregl.Marker[] = [];
  let debounceTimer: number | null = null;
  let routeController: AbortController | null = null;
  const cache = new Map<string, any[]>();

  // Haversine Distance Formula (calculates distance in km between coordinates)
  const calculateDistance = (lon1: number, lat1: number, lon2: number, lat2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Dynamically compute and sort stations — road distance from origin when available, else haversine
  const stations = () => {
    const center = mapCenter();
    const origin = userLocation();
    const roads = roadDistances();
    return allStations()
      .map((station) => {
        const distFromCenter = calculateDistance(center[0], center[1], station.coordinates[0], station.coordinates[1]);
        const roadKm = roads[station.id];
        const haversineFromOrigin = origin ? calculateDistance(origin[0], origin[1], station.coordinates[0], station.coordinates[1]) : null;
        const useRoad = roadKm !== undefined;
        const distKm = roadKm ?? haversineFromOrigin ?? distFromCenter;
        return {
          ...station,
          dist: `${distKm.toFixed(1)} KM`,
          distanceVal: distKm,
          fromOrigin: origin !== null,
          useRoad,
        };
      })
      .filter((station) => {
        const fromCenter = calculateDistance(center[0], center[1], station.coordinates[0], station.coordinates[1]);
        return fromCenter <= 5.0;
      })
      .sort((a, b) => a.distanceVal - b.distanceVal);
  };

  onMount(() => {
    updateSyncTime();

    fetchOverpassStations();

    if (!mapContainer) return;

    const mapInstance = new maplibregl.Map({
      container: mapContainer,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [DEFAULT_LOCATION.lng, DEFAULT_LOCATION.lat],
      zoom: DEFAULT_LOCATION.zoom,
      attributionControl: false,
    });

    mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }));

    mapInstance.on("load", () => {
      setMap(mapInstance);
      setIsMapInitializing(false);

      // Apply initial saved theme paint configuration
      applyThemeStyle(mapInstance, selectedTheme());

      // Apply initial saved layer visibility settings
      const vis = layerVisibility();
      Object.entries(vis).forEach(([feature, isVisible]) => {
        toggleMapLayerVisibility(mapInstance, feature, isVisible);
      });

      // Track map coordinates on moveend for optimal performance (saves CPU & redraw cycles)
      mapInstance.on("moveend", () => {
        const center = mapInstance.getCenter();
        setMapCenter([center.lng, center.lat]);
        updateSyncTime();
      });
    });
  });

  // Dynamic Markers & Popup Sync via Reactivity Effect
  createEffect(() => {
    const currentMap = map();
    if (!currentMap) return;
    const theme = selectedTheme();
    const markerColor = MAP_THEMES[theme as keyof typeof MAP_THEMES]?.colors?.marker ?? "#e0e0e0";
    const markerSelectedColor = MAP_THEMES[theme as keyof typeof MAP_THEMES]?.colors?.markerSelected ?? "#c3d9f3";

    // Clear old markers from the map layout
    markers.forEach((m) => m.remove());
    markers = [];

    // Render active/in-range markers only
    const center = mapCenter();
    const visibleStations = allStations().filter((station) => {
      const dist = calculateDistance(center[0], center[1], station.coordinates[0], station.coordinates[1]);
      return dist <= 5.0;
    });

    visibleStations.forEach((station) => {
      const el = document.createElement("div");
      el.id = `marker-${station.id}`;

      const isSelected = untrack(() => selectedStationId()) === station.id;
      const color = isSelected ? markerSelectedColor : markerColor;
      el.className = isSelected
        ? "maplibregl-marker flex items-center justify-center cursor-pointer z-50 animate-pulse"
        : "maplibregl-marker flex items-center justify-center cursor-pointer transition-opacity hover:opacity-75 z-10";
      el.innerHTML = isSelected
        ? `<span class="material-symbols-outlined" style="font-size: 32px; color: ${markerSelectedColor}; filter: drop-shadow(0 0 6px ${markerSelectedColor}80); font-variation-settings: 'FILL' 1;">local_gas_station</span>`
        : `<span class="material-symbols-outlined" style="font-size: 26px; color: ${markerColor}; filter: drop-shadow(0 0 4px ${markerColor}40); font-variation-settings: 'FILL' 1;">local_gas_station</span>`;

      // Register click listener FIRST, before passing to maplibregl.Marker constructor/setPopup
      // This allows us to stop propagation and manage popup toggle synchronously without double-toggling
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        selectStation(station, true);
      });

      const popup = new maplibregl.Popup({
        offset: 10,
        closeButton: false,
        className: "custom-telemetry-popup",
        maxWidth: "300px",
      }).setHTML(`
        <div class="font-label-sm text-[10px] text-primary uppercase">
          <div class="flex justify-between items-center border-b border-hairline pb-xs mb-xs">
            <span class="font-headline-md text-xs">${station.name}</span>
            ${userLocation() ? `
            <span data-route-btn class="material-symbols-outlined text-[16px] text-text-muted hover:text-ice-blue transition-colors cursor-pointer" style="font-variation-settings: 'FILL' 1;">north_east</span>
            ` : ""}
          </div>
          <div class="flex justify-between gap-md mb-xs">
            <span class="text-text-muted">PRICE (APPROX):</span>
            <span class="text-primary font-data-lg text-sm">~₱${station.price}</span>
          </div>
          ${station.fuelData ? `
          <div class="flex justify-between gap-md mb-xs text-[9px]">
            <span class="text-text-muted">${fuelLabel(station.brand, "diesel")}:</span>
            <span class="text-primary">${station.fuelData.diesel ?? "—"}</span>
          </div>
          <div class="flex justify-between gap-md mb-xs text-[9px]">
            <span class="text-text-muted">${fuelLabel(station.brand, "ron91")}:</span>
            <span class="text-primary">${station.fuelData.ron91 ?? "—"}</span>
          </div>
          <div class="flex justify-between gap-md mb-xs text-[9px]">
            <span class="text-text-muted">${fuelLabel(station.brand, "ron95")}:</span>
            <span class="text-primary">${station.fuelData.ron95 ?? "—"}</span>
          </div>
          ${String(station.brand ?? "").toLowerCase().includes("shell") ? `
          <div class="flex justify-between gap-md mb-xs text-[9px]">
            <span class="text-text-muted">${fuelLabel(station.brand, "ron97")}:</span>
            <span class="text-primary">${station.fuelData.ron97 ?? "—"}</span>
          </div>
          ` : ""}
          ` : ""}
          <div class="text-[7px] text-text-muted opacity-50 mt-xs pt-xs border-t border-hairline text-center tracking-[1px]">* APPROXIMATE BASED ON AGGREGATED DATA</div>
        </div>
      `);

      // Attach route button click handler directly to popup element
      // (document-level delegation fails because MapLibre popups intercept pointer events)
      const popupEl = popup.getElement();
      if (popupEl) {
        popupEl.addEventListener("click", (e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-route-btn]")) {
            e.stopPropagation();
            toggleRoute();
          }
        });
      }

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(station.coordinates)
        .setPopup(popup)
        .addTo(currentMap);

      markers.push(marker);

      // Re-trigger popup if this station is selected
      if (isSelected && !marker.getPopup()?.isOpen()) {
        marker.togglePopup();
      }
    });

    // Render user origin marker
    const userLoc = userLocation();
    if (userLoc) {
      const userEl = document.createElement("div");
      userEl.id = "user-location-marker";
      userEl.className = "maplibregl-marker flex items-center justify-center z-50 pointer-events-none";
      userEl.innerHTML = `<div class="relative flex items-center justify-center">
        <span class="absolute w-8 h-8 bg-ice-blue opacity-20 rounded-full animate-ping"></span>
        <span class="material-symbols-outlined" style="font-size: 32px; color: #c3d9f3; filter: drop-shadow(0 0 8px #c3d9f3aa); font-variation-settings: 'FILL' 1;">my_location</span>
      </div>`;
      const userMarker = new maplibregl.Marker({ element: userEl })
        .setLngLat(userLoc)
        .addTo(currentMap);
      markers.push(userMarker);
    }
  });

  // Selection Highlight Effect
  createEffect(() => {
    const activeId = selectedStationId();
    const currentMap = map();
    if (!currentMap) return;
    const theme = selectedTheme();
    const markerColor = MAP_THEMES[theme as keyof typeof MAP_THEMES]?.colors?.marker ?? "#e0e0e0";
    const markerSelectedColor = MAP_THEMES[theme as keyof typeof MAP_THEMES]?.colors?.markerSelected ?? "#c3d9f3";

    // Reset all markers to default
    allStations().forEach((station) => {
      const el = document.getElementById(`marker-${station.id}`);
      if (el) {
        el.className = "maplibregl-marker flex items-center justify-center cursor-pointer transition-opacity hover:opacity-75 z-10";
        el.innerHTML = `<span class="material-symbols-outlined" style="font-size: 26px; color: ${markerColor}; filter: drop-shadow(0 0 4px ${markerColor}40); font-variation-settings: 'FILL' 1;">local_gas_station</span>`;
      }
    });

    if (!activeId) return;

    // Highlight the selected marker
    const selectedEl = document.getElementById(`marker-${activeId}`);
    if (selectedEl) {
      const hasActiveRoute = showRoute();
      selectedEl.className = "maplibregl-marker flex items-center justify-center cursor-pointer z-50 animate-pulse";
      selectedEl.innerHTML = hasActiveRoute
        ? `<div class="relative"><span class="material-symbols-outlined" style="font-size: 32px; color: ${markerSelectedColor}; filter: drop-shadow(0 0 6px ${markerSelectedColor}99); font-variation-settings: 'FILL' 1;">local_gas_station</span><span class="absolute -top-1 -right-1 material-symbols-outlined text-[14px] text-ice-blue" style="filter: drop-shadow(0 0 4px #c3d9f3cc); font-variation-settings: 'FILL' 1;">directions</span></div>`
        : `<span class="material-symbols-outlined" style="font-size: 32px; color: ${markerSelectedColor}; filter: drop-shadow(0 0 6px ${markerSelectedColor}99); font-variation-settings: 'FILL' 1;">local_gas_station</span>`;
    }
  });

  // Route line drawing effect — fetches and draws route when showRoute is active
  createEffect(() => {
    const stationId = selectedStationId();
    const origin = userLocation();
    const shouldShow = showRoute();
    const currentMap = map();

    const cleanupRoute = () => {
      if (routeController) { routeController.abort(); routeController = null; }
      const cm = map();
      if (cm?.getLayer("route-line")) cm.removeLayer("route-line");
      if (cm?.getSource("route")) cm.removeSource("route");
    };

    if (!shouldShow || !stationId || !origin || !currentMap) {
      cleanupRoute();
      setIsFetchingRoute(false);
      return;
    }

    const station = allStations().find((s) => s.id === stationId);
    if (!station) { cleanupRoute(); setIsFetchingRoute(false); return; }

    setIsFetchingRoute(true);
    setRouteError(null);
    routeController = new AbortController();
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${station.coordinates[0]},${station.coordinates[1]}?overview=full&geometries=geojson&steps=false`,
      {
        headers: { "User-Agent": "octane-fuel-intelligence-client" },
        signal: routeController.signal,
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.code !== "Ok" || !data.routes?.[0]?.geometry) {
          setRouteError("ROUTE_NOT_FOUND");
          setIsFetchingRoute(false);
          return;
        }
        const cm = map();
        if (!cm) return;
        const geoJSON = { type: "Feature", properties: {}, geometry: data.routes[0].geometry };
        if (cm.getSource("route")) {
          (cm.getSource("route") as maplibregl.GeoJSONSource).setData(geoJSON as any);
        } else {
          cm.addSource("route", { type: "geojson", data: geoJSON as any });
          cm.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#c3d9f3",
              "line-width": 3,
              "line-opacity": 0.85,
              "line-blur": 1,
            },
          });
        }
        setIsFetchingRoute(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Route fetch error:", err);
        setRouteError("ROUTE_UNAVAILABLE");
        setIsFetchingRoute(false);
      });
  });

  onCleanup(() => {
    if (routeController) { routeController.abort(); routeController = null; }
    const currentMap = map();
    if (currentMap) {
      currentMap.off("click", handleMapPinClick);
      currentMap.remove();
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  });

  const selectStation = (station: Station, fromMap: boolean = false) => {
    setSelectedStationId(station.id);
    setShowRoute(false);
    updateSyncTime();

    // Toggle popups synchronously to prevent race conditions and double-toggling
    const targetMarker = markers.find(m => {
      const el = m.getElement();
      return el && el.id === `marker-${station.id}`;
    });

    if (targetMarker) {
      // Close other popups
      markers.forEach(m => {
        const p = m.getPopup();
        if (m !== targetMarker && p?.isOpen()) {
          p.remove();
        }
      });

      const popup = targetMarker.getPopup();
      if (popup) {
        if (fromMap) {
          // If clicked from map marker itself, toggle it
          targetMarker.togglePopup();
        } else {
          // If clicked from sidebar/list, ensure it is open
          if (!popup.isOpen()) {
            targetMarker.togglePopup();
          }
        }
      }
    }

    const currentMap = map();
    if (currentMap) {
      currentMap.flyTo({
        center: station.coordinates,
        zoom: fromMap ? Math.max(currentMap.getZoom(), 13) : currentMap.getZoom(),
        essential: true,
        padding: fromMap
          ? undefined
          : { top: 0, bottom: 0, left: window.innerWidth >= 768 ? 400 : 0, right: 0 },
      });
    }
    setShowMobileResults(false);
  };

  const handleZoomIn = () => {
    map()?.zoomIn();
  };

  const handleZoomOut = () => {
    map()?.zoomOut();
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          const loc: [number, number] = [longitude, latitude];
          setUserLocation(loc);
          setUserLocationMode("gps");
          setIsPinMode(false);
          map()?.flyTo({
            center: loc,
            zoom: 14,
            essential: true
          });
          updateSyncTime();
          fetchRoadDistances(loc, allStations());
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }
  };

  const togglePinMode = () => {
    if (isPinMode()) {
      const currentMap = map();
      if (currentMap) {
        currentMap.off("click", handleMapPinClick);
      }
      setIsPinMode(false);
    } else {
      setIsPinMode(true);
      const currentMap = map();
      if (currentMap) {
        currentMap.on("click", handleMapPinClick);
      }
    }
  };

  const handleMapPinClick = (e: maplibregl.MapMouseEvent) => {
    const { lng, lat } = e.lngLat;
    const loc: [number, number] = [lng, lat];
    setUserLocation(loc);
    setUserLocationMode("pin");
    setIsPinMode(false);
    const currentMap = map();
    if (currentMap) {
      currentMap.off("click", handleMapPinClick);
    }
    updateSyncTime();
    fetchRoadDistances(loc, allStations());
  };

  const clearUserLocation = () => {
    if (routeController) { routeController.abort(); routeController = null; }
    const currentMap = map();
    if (currentMap) {
      if (currentMap.getLayer("route-line")) currentMap.removeLayer("route-line");
      if (currentMap.getSource("route")) currentMap.removeSource("route");
    }
    setShowRoute(false);
    setUserLocation(null);
    setUserLocationMode(null);
    setRoadDistances({});
  };

  const toggleRoute = () => {
    setShowRoute((prev) => !prev);
    setRouteError(null);
  };

  const performGeocoding = async (query: string): Promise<any[]> => {
    const trimmed = query.trim().toLowerCase();
    if (cache.has(trimmed)) {
      return cache.get(trimmed) || [];
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
        {
          headers: {
            "User-Agent": "octane-fuel-intelligence-client"
          }
        }
      );
      if (!response.ok) {
        throw new Error("API response error");
      }
      const data = await response.json();
      cache.set(trimmed, data);
      return data;
    } catch (err) {
      console.error("Geocoding fetch failed:", err);
      return [];
    }
  };

  const debounceSearch = (query: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setStatusMessage("");
      return;
    }

    const stationResults: Suggestion[] = allStations()
      .filter((s) => s.name.toLowerCase().includes(trimmed.toLowerCase()))
      .slice(0, 5)
      .map((s) => ({
        type: "station" as const,
        station: s,
        matchName: s.name,
      }));

    if (stationResults.length > 0) {
      setSuggestions(stationResults);
      setStatusMessage("");
    } else {
      setStatusMessage("SCANNING");
    }

    debounceTimer = window.setTimeout(async () => {
      const geoData = await performGeocoding(trimmed);
      const locationResults: Suggestion[] = (geoData || [])
        .slice(0, 5)
        .map((item: any) => ({
          type: "location" as const,
          name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        }));

      const merged = [...stationResults, ...locationResults];
      if (merged.length === 0) {
        setStatusMessage("NO_RESULTS_FOUND");
        setSuggestions([]);
      } else {
        setStatusMessage("");
        setSuggestions(merged);
      }
    }, 1200);
  };

  const handleInput = (e: InputEvent & { currentTarget: HTMLInputElement }) => {
    const val = e.currentTarget.value;
    setSearchQuery(val);
    debounceSearch(val);
  };

  const selectLocation = (lon: number, lat: number, name: string) => {
    const currentMap = map();
    if (!currentMap) return;

    updateSyncTime();

    currentMap.flyTo({
      center: [lon, lat],
      zoom: 13,
      essential: true
    });

    setSuggestions([]);
    setStatusMessage("");
  };

  const selectStationSuggestion = (station: Station) => {
    selectStation(station);
    setSuggestions([]);
    setStatusMessage("");
  };

  const handleSearch = async (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      const query = searchQuery().trim();
      if (!query) return;

      const coordRegex = /^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/;
      const coordMatch = query.match(coordRegex);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[3]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          selectLocation(lng, lat, `Coordinates: ${lat}, ${lng}`);
          return;
        }
      }

      const q = query.toLowerCase();
      const stationMatch = allStations().find((s) =>
        s.name.toLowerCase().includes(q)
      );
      if (stationMatch) {
        selectStationSuggestion(stationMatch);
        return;
      }

      setStatusMessage("LOCATING");
      setIsSearching(true);
      const data = await performGeocoding(query);
      setIsSearching(false);

      if (data && data.length > 0) {
        const first = data[0];
        selectLocation(parseFloat(first.lon), parseFloat(first.lat), first.display_name);
      } else {
        setStatusMessage("NO_RESULTS_FOUND");
      }
    }
  };

  const handleThemeChange = (themeName: string) => {
    setSelectedTheme(themeName);
    localStorage.setItem("octane-map-theme", themeName);
    setShowThemePanel(false);
    
    const currentMap = map();
    if (currentMap) {
      applyThemeStyle(currentMap, themeName);
    }
  };

  const handleLayerToggle = (feature: string) => {
    const currentVis = layerVisibility();
    const updatedVal = !currentVis[feature];
    const newVis = { ...currentVis, [feature]: updatedVal };
    
    setLayerVisibility(newVis);
    localStorage.setItem("octane-layer-visibility", JSON.stringify(newVis));
    
    const currentMap = map();
    if (currentMap) {
      toggleMapLayerVisibility(currentMap, feature, updatedVal);
    }
  };

  return (
    <div class="relative flex-grow flex overflow-hidden h-[calc(100vh-64px-64px)] md:h-[calc(100vh-64px)]">
      {/* Map Canvas */}
      <div class="absolute inset-0 z-0 bg-background">
        <div 
          ref={mapContainer} 
          class={`w-full h-full transition-opacity duration-300 ${
            selectedTheme() === "DEFAULT" ? "opacity-60 filter-monochrome-dark" : "opacity-90"
          } ${isPinMode() ? "cursor-crosshair" : ""}`} 
        />
        
        {/* Initialization Overlay */}
        {isMapInitializing() && (
          <div class="absolute inset-0 bg-background flex flex-col items-center justify-center z-40">
            <div class="flex items-center gap-xs mb-sm">
              <span class="w-1.5 h-1.5 bg-primary animate-ping"></span>
              <span class="w-1.5 h-1.5 bg-primary animate-ping delay-75"></span>
              <span class="w-1.5 h-1.5 bg-primary animate-ping delay-150"></span>
            </div>
            <span class="font-label-sm text-label-sm text-primary uppercase tracking-[3px] animate-pulse">
              INITIALIZING TELEMETRY ENGINE...
            </span>
          </div>
        )}
      </div>

      {/* Side Panel */}
      <aside class={`absolute md:relative z-10 flex flex-col w-full md:w-[400px] h-full md:h-auto bg-surface border-r border-hairline mt-xl md:mt-0 transition-transform duration-300 ${
        showMobileResults() ? "translate-y-0 md:translate-x-0" : "translate-y-full md:-translate-x-full md:translate-y-0"
      }`}>
        <div class="p-container-margin border-b border-hairline bg-surface-soft">
          <div class="flex justify-between items-center mb-xs">
            <div>
              <h2 class="font-headline-md text-headline-md uppercase tracking-wider mb-xs">NEARBY_UNITS</h2>
              <p class="font-label-sm text-label-sm text-text-muted">SCANNING RADIUS: 5.0KM</p>
            </div>
          </div>
          {userLocation() && (
            <div class="flex items-center gap-xs mb-xs">
              <span class="material-symbols-outlined text-[14px] text-ice-blue" style="font-variation-settings: 'FILL' 1;">my_location</span>
              <span class="font-label-sm text-[9px] text-ice-blue uppercase tracking-[1px]">
                ORIGIN: {userLocationMode() === "gps" ? "GPS FIX" : "PIN DROP"}
              </span>
            </div>
          )}
          {isPinMode() && (
            <div class="flex items-center gap-xs mb-xs">
              <span class="material-symbols-outlined text-[14px] text-ice-blue animate-pulse">pin_drop</span>
              <span class="font-label-sm text-[9px] text-ice-blue uppercase tracking-[1px] animate-pulse">PIN_MODE: CLICK MAP TO SET ORIGIN</span>
            </div>
          )}
          {isRouting() && (
            <div class="flex items-center gap-xs mb-xs">
              <span class="material-symbols-outlined text-[14px] text-ice-blue animate-spin">sync</span>
              <span class="font-label-sm text-[9px] text-ice-blue uppercase tracking-[1px] animate-pulse">ROUTING...</span>
            </div>
          )}
          {isFetchingRoute() && (
            <div class="flex items-center gap-xs mb-xs">
              <span class="material-symbols-outlined text-[14px] text-ice-blue animate-spin">route</span>
              <span class="font-label-sm text-[9px] text-ice-blue uppercase tracking-[1px] animate-pulse">CALCULATING_ROUTE...</span>
            </div>
          )}
          {routeError() && (
            <div class="flex items-center gap-xs mb-xs">
              <span class="material-symbols-outlined text-[14px] text-text-muted">error</span>
              <span class="font-label-sm text-[9px] text-text-muted uppercase tracking-[1px]">{routeError()}</span>
            </div>
          )}
          <div class="bg-background border border-hairline p-sm flex items-center gap-xs">
            <span class="material-symbols-outlined text-on-surface-variant">
              {isSearching() ? "sync" : "search"}
            </span>
            <input
              class="bg-transparent border-none focus:ring-0 text-primary font-label-md w-full placeholder:text-on-surface-variant uppercase tracking-[1px] outline-none"
              placeholder={isSearching() ? "LOCATING..." : "SEARCH COORDINATES OR REGION"}
              aria-label="Search region or coordinates"
              type="text"
              value={searchQuery()}
              onInput={handleInput}
              onKeyDown={handleSearch}
            />
          </div>
          {statusMessage() && (
            <div class="bg-background border border-hairline border-t-0 p-xs font-label-sm text-[10px] text-text-muted uppercase tracking-wider text-center">
              [ STATUS: {statusMessage()} ]
            </div>
          )}
          {suggestions().length > 0 && (
            <div class="bg-background border border-hairline border-t-0 flex flex-col max-h-[200px] overflow-y-auto">
              <For each={suggestions()}>
                {(item) => {
                  if (item.type === "station") {
                    return (
                      <button
                        onClick={() => selectStationSuggestion(item.station)}
                        class="w-full text-left p-xs border-b border-hairline last:border-b-0 hover:bg-surface-soft transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <p class="font-label-md text-[11px] text-primary uppercase tracking-[1px]">{item.station.name.replace(/_/g, " ")}</p>
                        <p class="font-label-sm text-[9px] text-text-muted uppercase tracking-[1px] mt-[1px]">{item.station.priceGrade ? `₱${item.station.price} ${item.station.priceGrade}` : "STATION"}</p>
                      </button>
                    );
                  }
                  return (
                    <button
                      onClick={() => selectLocation(item.lon, item.lat, item.name)}
                      class="w-full text-left p-xs border-b border-hairline last:border-b-0 hover:bg-surface-soft transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <p class="font-label-sm text-[10px] text-primary uppercase tracking-[1px] truncate">{item.name}</p>
                      <p class="font-label-sm text-[9px] text-text-muted uppercase tracking-[1px] mt-[1px]">LOCATION</p>
                    </button>
                  );
                }}
              </For>
            </div>
          )}
        </div>

        {/* Desktop Collapse Tab */}
        <div class="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-full z-20">
          <button
            onClick={() => setShowMobileResults(false)}
            class="bg-surface border border-r-0 border-hairline py-xs px-[6px] flex flex-col items-center gap-xs text-primary hover:bg-surface-soft transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            type="button"
            aria-label="Collapse sidebar"
          >
            <span class="material-symbols-outlined text-lg">keyboard_arrow_left</span>
            <span class="font-label-sm text-[8px] uppercase tracking-[1px]" style={{ "writing-mode": "vertical-rl" }}>HIDE</span>
          </button>
        </div>

        {/* Dynamic Sidebar List / Empty State */}
        <div class="flex-grow overflow-y-auto">
          {stationsLoading() ? (
            <div class="h-full flex flex-col items-center justify-center p-md text-center bg-surface-soft">
              <span class="material-symbols-outlined text-text-muted text-lg mb-xs animate-spin">sync</span>
              <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">SCANNING_NETWORK...</span>
            </div>
          ) : stationsError() ? (
            <div class="h-full flex flex-col items-center justify-center p-md text-center bg-surface-soft">
              <span class="material-symbols-outlined text-text-muted text-lg mb-xs">sensors_off</span>
              <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">CONNECTION_FAILED</span>
              <span class="font-label-sm text-[9px] text-text-muted opacity-80 uppercase tracking-[1px] mt-xs">{stationsError()}</span>
              <button
                onClick={fetchOverpassStations}
                class="mt-md font-label-sm text-label-sm text-ice-blue uppercase tracking-[2px] hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
                type="button"
              >
                [RETRY_CONNECTION]
              </button>
            </div>
          ) : stations().length === 0 ? (
            <div class="h-full flex flex-col items-center justify-center p-md text-center bg-surface-soft">
              <span class="material-symbols-outlined text-text-muted text-lg mb-xs">sensors_off</span>
              <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">NO_UNITS_IN_RANGE</span>
              <span class="font-label-sm text-[9px] text-text-muted opacity-40 uppercase tracking-[1px] mt-xs">PAN OR SEARCH ANOTHER SECTOR</span>
            </div>
          ) : (
            <For each={stations()}>
              {(station) => (
                <MapResult
                  name={station.name}
                  brand={(station as any).brand}
                  preferredGrade={(station as any).preferredGrade}
                  price={station.price}
                  priceGrade={(station as any).priceGrade}
                  fuelData={(station as any).fuelData}
                  dist={station.dist}
                  selected={selectedStationId() === station.id}
                  onClick={() => selectStation(station)}
                  fromOrigin={(station as any).fromOrigin}
                  useRoad={(station as any).useRoad}
                />
              )}
            </For>
          )}
        </div>
        
        <div class="p-sm bg-surface-soft border-t border-hairline flex flex-col">
          <div class="flex justify-between items-center mb-xs">
            <span class="font-label-sm text-label-sm text-primary uppercase tracking-[2px]">{syncTime()}</span>
            <div class="flex gap-xs">
              <div class="w-1 h-1 bg-primary rounded-full"></div>
              <div class="w-1 h-1 bg-primary rounded-full"></div>
              <div class="w-1 h-1 bg-primary rounded-full opacity-20"></div>
            </div>
          </div>
          <span class="font-label-sm text-[7px] text-text-muted opacity-40 tracking-[1px]">* PRICES ARE APPROXIMATIONS BASED ON AGGREGATED DATA</span>
        </div>
      </aside>

      {/* Map Controls */}
      <div class="absolute bottom-container-margin right-container-margin flex flex-col gap-sm z-20">
        <button 
          onClick={handleZoomIn}
          class="w-12 h-12 bg-surface border border-hairline flex items-center justify-center text-primary hover:bg-surface-soft transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
          type="button"
          aria-label="Zoom In"
        >
          <span class="material-symbols-outlined">add</span>
        </button>
        <button 
          onClick={handleZoomOut}
          class="w-12 h-12 bg-surface border border-hairline flex items-center justify-center text-primary hover:bg-surface-soft transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
          type="button"
          aria-label="Zoom Out"
        >
          <span class="material-symbols-outlined">remove</span>
        </button>
        <button 
          onClick={handleLocateMe}
          class={`w-12 h-12 flex items-center justify-center transition-colors focus:outline-none focus:ring-1 focus:ring-primary ${
            userLocationMode() === "gps" ? "bg-ice-blue text-background" : "bg-primary text-background"
          } hover:opacity-80`}
          type="button"
          aria-label="Set origin via GPS"
        >
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">my_location</span>
        </button>
        <button 
          onClick={togglePinMode}
          class={`w-12 h-12 flex items-center justify-center border transition-colors focus:outline-none focus:ring-1 focus:ring-primary ${
            isPinMode() ? "bg-ice-blue text-background border-ice-blue" : "bg-surface text-primary border-hairline hover:bg-surface-soft"
          }`}
          type="button"
          aria-label="Set origin by pin drop"
        >
          <span class="material-symbols-outlined">pin_drop</span>
        </button>
        {userLocation() && (
          <button 
            onClick={clearUserLocation}
            class="w-12 h-12 bg-surface border border-hairline flex items-center justify-center text-text-muted hover:text-primary hover:bg-surface-soft transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
            type="button"
            aria-label="Clear origin"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {/* Map Settings / Theme Switcher (Lowest Left of Map) */}
      <div class="absolute bottom-container-margin left-container-margin z-20 flex flex-col items-start transition-all duration-300" style={{ left: `calc(${window.innerWidth >= 768 && showMobileResults() ? "420px" : "20px"})` }}>
        {/* Compact Theme & Layer Selection Overlay */}
        {showThemePanel() && (
          <div class="mb-xs bg-surface border border-hairline p-sm flex flex-col gap-sm w-56 shadow-none rounded-none animate-fade-in">
            {/* Theme Selector */}
            <div>
              <span class="font-label-sm text-[9px] text-text-muted px-xs uppercase border-b border-hairline pb-xs mb-xs block">MAP_THEME</span>
              <div class="flex gap-xs mt-xs">
                <button 
                  onClick={() => handleThemeChange("DEFAULT")}
                  class={`flex-1 text-center py-[6px] font-label-sm text-[10px] uppercase transition-colors cursor-pointer ${
                    selectedTheme() === "DEFAULT" ? "text-primary bg-surface-bright border border-hairline-strong" : "text-text-muted hover:bg-surface-soft border border-transparent"
                  }`}
                  type="button"
                >
                  DEFAULT
                </button>
                <button 
                  onClick={() => handleThemeChange("NOIR")}
                  class={`flex-1 text-center py-[6px] font-label-sm text-[10px] uppercase transition-colors cursor-pointer ${
                    selectedTheme() === "NOIR" ? "text-primary bg-surface-bright" : "text-text-muted hover:bg-surface-soft"
                  }`}
                  type="button"
                >
                  NOIR
                </button>
              </div>
            </div>

            {/* Layer Visibility Settings */}
            <div>
              <span class="font-label-sm text-[9px] text-text-muted px-xs uppercase border-b border-hairline pb-xs mb-xs block">LAYER_SETTINGS</span>
              <div class="flex flex-col gap-xs mt-xs max-h-[180px] overflow-y-auto pr-xs">
                <For each={Object.keys(layerVisibility())}>
                  {(feature) => (
                    <button
                      onClick={() => handleLayerToggle(feature)}
                      class="flex justify-between items-center w-full px-xs py-[4px] font-label-sm text-[10px] uppercase hover:bg-surface-soft transition-colors cursor-pointer text-left focus:outline-none"
                      type="button"
                    >
                      <span class={layerVisibility()[feature] ? "text-primary" : "text-text-muted"}>
                        {feature}
                      </span>
                      <span class={`font-label-sm text-[9px] ${layerVisibility()[feature] ? "text-ice-blue animate-pulse" : "text-text-muted opacity-40"}`}>
                        {layerVisibility()[feature] ? "[ON]" : "[OFF]"}
                      </span>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>
        )}

        {/* Settings Trigger Button */}
        <button 
          onClick={() => setShowThemePanel(!showThemePanel())}
          class="w-12 h-12 bg-surface border border-hairline flex items-center justify-center text-primary hover:bg-surface-soft transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
          type="button"
          aria-label="Toggle map settings"
        >
          <span class="material-symbols-outlined">settings</span>
        </button>
      </div>

      {/* Mobile Results Toggle */}
      <div class="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
        <button 
          onClick={() => setShowMobileResults(!showMobileResults())}
          class="bg-surface border border-hairline px-md py-xs flex items-center gap-xs rounded-full focus:outline-none focus:ring-1 focus:ring-primary"
          type="button"
          aria-label={showMobileResults() ? "Hide sidebar results" : "Show sidebar results"}
        >
          <span class="font-label-md text-label-md uppercase tracking-[2px]">{showMobileResults() ? "HIDE" : "SHOW_RESULTS"}</span>
          <span class="material-symbols-outlined">{showMobileResults() ? "keyboard_arrow_down" : "keyboard_arrow_up"}</span>
        </button>
      </div>

      {/* Desktop Sidebar Reopen */}
      <div class="hidden md:flex absolute top-0 left-0 h-full z-20 items-center">
        <button 
          onClick={() => setShowMobileResults(true)}
          class={`bg-surface border border-l-0 border-hairline py-xs px-[6px] flex flex-col items-center gap-xs text-primary hover:bg-surface-soft transition-colors focus:outline-none focus:ring-1 focus:ring-primary ${
            showMobileResults() ? "hidden" : ""
          }`}
          type="button"
          aria-label="Open sidebar"
        >
          <span class="material-symbols-outlined text-lg">keyboard_arrow_right</span>
          <span class="font-label-sm text-[8px] uppercase tracking-[1px]" style={{ "writing-mode": "vertical-rl" }}>UNITS</span>
        </button>
      </div>
    </div>
  );
};

interface MapResultProps {
  name: string;
  brand?: string;
  preferredGrade?: string;
  price: string;
  priceGrade?: string;
  fuelData?: FuelData;
  dist: string;
  selected?: boolean;
  onClick?: () => void;
  fromOrigin?: boolean;
  useRoad?: boolean;
}

const MapResult: Component<MapResultProps> = (props) => {
  return (
    <button 
      onClick={props.onClick}
      class={`w-full text-left p-container-margin border-b border-hairline transition-colors cursor-pointer group focus:outline-none focus:bg-surface-soft ${
        props.selected ? "bg-surface-bright" : "hover:bg-surface-soft"
      }`}
      type="button"
    >
      <div class="flex justify-between items-start mb-sm">
        <h3 class="font-headline-md text-headline-md leading-none">{props.name}</h3>
        <div class="text-right">
          <span class="font-data-lg text-data-lg text-primary">
            ₱{props.price}
          </span>
          <div class="font-label-sm text-[9px] text-ice-blue uppercase tracking-[1px]">
            APPROX
          </div>
        </div>
      </div>
      <div class="flex items-center gap-md">
        <div class="flex flex-col">
          <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-[1px] flex items-center gap-xs">
            DISTANCE
            {props.fromOrigin && (
              <span class={`font-label-sm text-[7px] uppercase tracking-[1px] ${props.useRoad ? "text-ice-blue" : "text-text-muted opacity-40"}`}>
                [{props.useRoad ? "ROAD" : "LINEAR"}]
              </span>
            )}
          </span>
          <span class="font-label-md text-label-md text-primary">{props.dist}</span>
        </div>
        {props.fuelData && (
          <div class="ml-auto flex flex-col items-end gap-[2px]">
            {props.fuelData.diesel && (
              <div class="flex gap-xs">
                <span class="font-label-sm text-[8px] text-text-muted uppercase">{fuelLabel(props.brand, "diesel")}</span>
                <span class="font-label-sm text-[8px] text-primary">{props.fuelData.diesel}</span>
              </div>
            )}
            {props.fuelData.ron91 && (
              <div class="flex gap-xs">
                <span class="font-label-sm text-[8px] text-text-muted uppercase">{fuelLabel(props.brand, "ron91")}</span>
                <span class="font-label-sm text-[8px] text-primary">{props.fuelData.ron91}</span>
              </div>
            )}
            {props.fuelData.ron95 && (
              <div class="flex gap-xs">
                <span class="font-label-sm text-[8px] text-text-muted uppercase">{fuelLabel(props.brand, "ron95")}</span>
                <span class="font-label-sm text-[8px] text-primary">{props.fuelData.ron95}</span>
              </div>
            )}
            {props.fuelData.ron97 && props.brand?.toLowerCase().includes("shell") && (
              <div class="flex gap-xs">
                <span class="font-label-sm text-[8px] text-text-muted uppercase">{fuelLabel(props.brand, "ron97")}</span>
                <span class="font-label-sm text-[8px] text-primary">{props.fuelData.ron97}</span>
              </div>
            )}
          </div>
        )}
        {!props.fuelData && (
          <div class="ml-auto">
            <span class="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
          </div>
        )}
      </div>
    </button>
  );
};


export default MapPage;
