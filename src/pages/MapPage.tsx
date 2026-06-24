import { Component, createSignal, onMount, onCleanup, For, createEffect, untrack } from "solid-js";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_THEMES, applyThemeStyle, toggleMapLayerVisibility } from "../constants/mapThemes";

interface FuelData {
  diesel?: string;
  ron91?: string;
  ron95?: string;
  ron97?: string;
}

interface Station {
  id: string;
  name: string;
  price: string;
  priceGrade?: string;
  fuelData?: FuelData;
  dist: string;
  status: string;
  coordinates: [number, number]; // [lng, lat]
}

const DEFAULT_LOCATION = {
  name: "Olongapo City, Zambales, Philippines",
  lng: 120.2824,
  lat: 14.8386,
  zoom: 12,
};

const initialStations: Station[] = [
  { id: "aral", name: "ARAL_ULTIMATE", price: "1.849", dist: "0.8 KM", status: "OPERATIONAL", coordinates: [120.2924, 14.8436] },
  { id: "shell", name: "SHELL_V-POWER", price: "1.899", dist: "1.2 KM", status: "OPERATIONAL", coordinates: [120.2702, 14.8306] },
  { id: "jet", name: "JET_STATION", price: "1.789", dist: "2.5 KM", status: "PEAK_HOURS", coordinates: [120.3002, 14.8236] },
  { id: "esso", name: "ESSO_SYNERGY", price: "1.829", dist: "3.1 KM", status: "OPERATIONAL", coordinates: [120.2602, 14.8506] },
];


const MapPage: Component = () => {
  let mapContainer: HTMLDivElement | undefined;
  const [map, setMap] = createSignal<maplibregl.Map | null>(null);
  const [selectedStationId, setSelectedStationId] = createSignal<string | null>(null);
  const [showMobileResults, setShowMobileResults] = createSignal<boolean>(false);
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
  const [suggestions, setSuggestions] = createSignal<{ name: string; lat: number; lon: number }[]>([]);
  const [statusMessage, setStatusMessage] = createSignal<string>("");

  const [syncTime, setSyncTime] = createSignal<string>("");

  const updateSyncTime = () => {
    const now = new Date();
    const formatted = `SYNCED_${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    setSyncTime(formatted);
  };

  const fetchOverpassStations = async (): Promise<Station[]> => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
    try {
      const response = await fetch(`${API_BASE}/stations`);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch fuel stations from backend:", error);
      return [];
    }
  };

  let markers: maplibregl.Marker[] = [];
  let debounceTimer: number | null = null;
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

  // Dynamically compute and sort stations within 5.0 KM scanning radius of current map center
  const stations = () => {
    const center = mapCenter();
    return allStations()
      .map((station) => {
        const distKm = calculateDistance(center[0], center[1], station.coordinates[0], station.coordinates[1]);
        return {
          ...station,
          distanceVal: distKm,
          dist: `${distKm.toFixed(1)} KM`
        };
      })
      .filter((station) => station.distanceVal <= 5.0) // 5.0KM scanning limit
      .sort((a, b) => a.distanceVal - b.distanceVal);
  };

  onMount(() => {
    updateSyncTime();

    fetchOverpassStations().then((fetched) => {
      if (fetched.length > 0) {
        setAllStations(fetched);
      }
    });

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
      el.className = isSelected 
        ? "maplibregl-marker w-4 h-4 bg-ice-blue border-2 border-primary rounded-none cursor-pointer scale-125 z-50 animate-pulse"
        : "maplibregl-marker w-3 h-3 bg-primary border border-hairline-strong rounded-none cursor-pointer transition-transform hover:scale-125 duration-150 z-10";

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
        className: "custom-telemetry-popup"
      }).setHTML(`
        <div class="font-label-sm text-[10px] text-primary uppercase">
          <div class="font-headline-md text-xs border-b border-hairline pb-xs mb-xs">${station.name}</div>
          <div class="flex justify-between gap-md mb-xs">
            <span class="text-text-muted">PRICE (${station.priceGrade ?? "RON_91"}):</span>
            <span class="text-primary font-data-lg text-sm">${station.price}</span>
          </div>
          ${station.fuelData ? `
          <div class="flex justify-between gap-md mb-xs text-[9px]">
            <span class="text-text-muted">DIESEL:</span>
            <span class="text-primary">${station.fuelData.diesel ?? "—"}</span>
          </div>
          <div class="flex justify-between gap-md mb-xs text-[9px]">
            <span class="text-text-muted">RON 91:</span>
            <span class="text-primary">${station.fuelData.ron91 ?? "—"}</span>
          </div>
          <div class="flex justify-between gap-md mb-xs text-[9px]">
            <span class="text-text-muted">RON 95:</span>
            <span class="text-primary">${station.fuelData.ron95 ?? "—"}</span>
          </div>
          ` : ""}
          <div class="flex justify-between gap-md">
            <span class="text-text-muted">STATUS:</span>
            <span class="text-ice-blue">${station.status}</span>
          </div>
        </div>
      `);


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
  });

  // Selection Highlight Effect (classnames only)
  createEffect(() => {
    const activeId = selectedStationId();
    const currentMap = map();
    if (!currentMap) return;

    // Reset all marker classes to standard white
    allStations().forEach((station) => {
      const el = document.getElementById(`marker-${station.id}`);
      if (el) {
        el.className = "maplibregl-marker w-3 h-3 bg-primary border border-hairline-strong rounded-none cursor-pointer transition-transform hover:scale-125 duration-150 z-10";
      }
    });

    if (!activeId) return;

    // Highlight the selected marker
    const selectedEl = document.getElementById(`marker-${activeId}`);
    if (selectedEl) {
      selectedEl.className = "maplibregl-marker w-4 h-4 bg-ice-blue border-2 border-primary rounded-none cursor-pointer scale-125 z-50 animate-pulse";
    }
  });

  onCleanup(() => {
    const currentMap = map();
    if (currentMap) {
      currentMap.remove();
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  });

  const selectStation = (station: Station, fromMap: boolean = false) => {
    setSelectedStationId(station.id);
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
        zoom: 14,
        essential: true,
        padding: { left: window.innerWidth >= 768 ? 400 : 0 }
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
          map()?.flyTo({
            center: [longitude, latitude],
            zoom: 14,
            essential: true
          });
          updateSyncTime();
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }
  };

  const performGeocoding = async (query: string): Promise<any[]> => {
    const trimmed = query.trim().toLowerCase();
    if (cache.has(trimmed)) {
      const cachedData = cache.get(trimmed) || [];
      handleGeocodingResults(cachedData);
      return cachedData;
    }

    try {
      setIsSearching(true);
      setStatusMessage("QUERYING_DATABASE");
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
      handleGeocodingResults(data);
      return data;
    } catch (err) {
      console.error("Geocoding fetch failed:", err);
      setStatusMessage("CONNECTION_FAILED");
      setSuggestions([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  const handleGeocodingResults = (data: any[]) => {
    if (!data || data.length === 0) {
      setStatusMessage("NO_RESULTS_FOUND");
      setSuggestions([]);
      return;
    }
    setStatusMessage("");
    const formatted = data.map((item: any) => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon)
    }));
    setSuggestions(formatted);
  };

  const debounceSearch = (query: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (!query.trim()) {
      setSuggestions([]);
      setStatusMessage("");
      return;
    }

    setStatusMessage("SCANNING");
    debounceTimer = window.setTimeout(async () => {
      await performGeocoding(query);
    }, 1000);
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

      const data = await performGeocoding(query);
      if (data && data.length > 0) {
        const first = data[0];
        selectLocation(parseFloat(first.lon), parseFloat(first.lat), first.display_name);
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
          }`} 
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

      {/* Search Overlay */}
      <div class="absolute top-container-margin left-container-margin right-container-margin md:left-container-margin md:right-auto md:w-[400px] z-20 flex flex-col gap-xs">
        <div class="bg-surface-soft border border-hairline p-sm flex items-center gap-xs">
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

        {/* Status Message Display */}
        {statusMessage() && (
          <div class="bg-surface-soft border border-hairline p-xs font-label-sm text-[10px] text-text-muted uppercase tracking-wider text-center">
            [ STATUS: {statusMessage()} ]
          </div>
        )}

        {/* Suggestions Autocomplete List */}
        {suggestions().length > 0 && (
          <div class="bg-surface border border-hairline flex flex-col max-h-[200px] overflow-y-auto">
            <For each={suggestions()}>
              {(item) => (
                <button
                  onClick={() => selectLocation(item.lon, item.lat, item.name)}
                  class="w-full text-left p-xs border-b border-hairline font-label-sm text-[10px] text-primary hover:bg-surface-soft transition-colors uppercase truncate cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {item.name}
                </button>
              )}
            </For>
          </div>
        )}
      </div>

      {/* Side Panel */}
      <aside class={`absolute md:relative z-10 flex flex-col w-full md:w-[400px] h-full md:h-auto bg-surface border-r border-hairline mt-xl md:mt-0 transition-transform duration-300 ${
        showMobileResults() ? "translate-y-0" : "translate-y-full md:translate-y-0"
      }`}>
        <div class="p-container-margin border-b border-hairline bg-surface-soft flex justify-between items-center">
          <div>
            <h2 class="font-headline-md text-headline-md uppercase tracking-wider mb-xs">NEARBY_UNITS</h2>
            <p class="font-label-sm text-label-sm text-text-muted">SCANNING RADIUS: 5.0KM</p>
          </div>
          <button 
            class="md:hidden text-primary hover:text-text-muted" 
            onClick={() => setShowMobileResults(false)}
            type="button"
            aria-label="Close sidebar results"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        {/* Dynamic Sidebar List / Empty State */}
        <div class="flex-grow overflow-y-auto">
          {stations().length === 0 ? (
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
                  price={station.price}
                  priceGrade={(station as any).priceGrade}
                  fuelData={(station as any).fuelData}
                  dist={station.dist}
                  status={station.status}
                  selected={selectedStationId() === station.id}
                  onClick={() => selectStation(station)}
                />
              )}
            </For>
          )}
        </div>
        
        <div class="p-sm bg-surface-soft border-t border-hairline flex justify-between items-center">
          <span class="font-label-sm text-label-sm text-primary uppercase tracking-[2px]">{syncTime()}</span>
          <div class="flex gap-xs">
            <div class="w-1 h-1 bg-primary rounded-full"></div>
            <div class="w-1 h-1 bg-primary rounded-full"></div>
            <div class="w-1 h-1 bg-primary rounded-full opacity-20"></div>
          </div>
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
          class="w-12 h-12 bg-primary text-background flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none focus:ring-1 focus:ring-primary"
          type="button"
          aria-label="Locate Me"
        >
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">my_location</span>
        </button>
      </div>

      {/* Map Settings / Theme Switcher (Lowest Left of Map) */}
      <div class="absolute bottom-container-margin left-container-margin md:left-[calc(400px+20px)] z-20 flex flex-col items-start">
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
          onClick={() => setShowMobileResults(true)}
          class="bg-surface border border-hairline px-md py-xs flex items-center gap-xs rounded-full focus:outline-none focus:ring-1 focus:ring-primary"
          type="button"
          aria-label="Show sidebar results"
        >
          <span class="font-label-md text-label-md uppercase tracking-[2px]">SHOW_RESULTS</span>
          <span class="material-symbols-outlined">keyboard_arrow_up</span>
        </button>
      </div>
    </div>
  );
};

interface MapResultProps {
  name: string;
  price: string;
  priceGrade?: string;
  fuelData?: FuelData;
  dist: string;
  status: string;
  selected?: boolean;
  onClick?: () => void;
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
            {props.price}
          </span>
          <div class="font-label-sm text-[9px] text-ice-blue uppercase tracking-[1px]">
            {props.priceGrade ?? "RON_91"}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-md">
        <div class="flex flex-col">
          <span class="font-label-sm text-label-sm text-text-muted uppercase">DISTANCE</span>
          <span class="font-label-md text-label-md text-primary">{props.dist}</span>
        </div>
        <div class="flex flex-col">
          <span class="font-label-sm text-label-sm text-text-muted uppercase">PUMP_STATUS</span>
          <span class="font-label-md text-label-md text-primary">{props.status}</span>
        </div>
        {props.fuelData && (
          <div class="ml-auto flex flex-col items-end gap-[2px]">
            {props.fuelData.diesel && (
              <div class="flex gap-xs">
                <span class="font-label-sm text-[8px] text-text-muted uppercase">DSL</span>
                <span class="font-label-sm text-[8px] text-primary">{props.fuelData.diesel}</span>
              </div>
            )}
            {props.fuelData.ron91 && (
              <div class="flex gap-xs">
                <span class="font-label-sm text-[8px] text-text-muted uppercase">R91</span>
                <span class="font-label-sm text-[8px] text-primary">{props.fuelData.ron91}</span>
              </div>
            )}
            {props.fuelData.ron95 && (
              <div class="flex gap-xs">
                <span class="font-label-sm text-[8px] text-text-muted uppercase">R95</span>
                <span class="font-label-sm text-[8px] text-primary">{props.fuelData.ron95}</span>
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
