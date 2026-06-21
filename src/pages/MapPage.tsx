import type { Component } from "solid-js";

const MapPage: Component = () => {
  return (
    <div class="relative flex-grow flex overflow-hidden h-[calc(100vh-64px-64px)] md:h-[calc(100vh-64px)]">
      {/* Map Canvas */}
      <div class="absolute inset-0 z-0 bg-background">
        <div class="w-full h-full opacity-40" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuDH_-3rdmlqMAL5ceWKl68zKy32jkETLuyksqeEqMaLf8nxrFQbB4sJCMXXLGFctTGoHe8HUO2tijDzfR0JjC3b7hOGoM7Nwjcw_v5axwhVa59V7YU84raUEDjQYomVoerW-s-13AzEeQ8JyoK6Bvi3qE4F0uK-A7p5GYaEGMavJ7aLoTziytPWbM-JZYGwC128PdY--OQNzjPtKpYXlkmgGsWKC8iGmxtOV284VA5itbaZzu3xdXw1DXXidB2QeU1jPxQFGDxYKew')"></div>
        <div class="absolute inset-0" style="background-image: radial-gradient(circle at 2px 2px, #262626 1px, transparent 0); background-size: 24px 24px;"></div>
        {/* Map pins */}
        <div class="absolute top-1/4 left-1/3 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
        <div class="absolute top-1/2 left-1/2 w-2 h-2 bg-primary rounded-full"></div>
        <div class="absolute top-2/3 left-1/4 w-2 h-2 bg-primary rounded-full"></div>
      </div>

      {/* Search Overlay */}
      <div class="absolute top-container-margin left-container-margin right-container-margin md:left-container-margin md:right-auto md:w-[400px] z-20">
        <div class="bg-surface-soft border border-hairline p-sm flex items-center gap-xs">
          <span class="material-symbols-outlined text-on-surface-variant">search</span>
          <input
            class="bg-transparent border-none focus:ring-0 text-primary font-label-md w-full placeholder:text-on-surface-variant uppercase tracking-[1px] outline-none"
            placeholder="SEARCH COORDINATES OR REGION"
            type="text"
          />
        </div>
      </div>

      {/* Side Panel */}
      <aside class="relative z-10 hidden md:flex flex-col w-[400px] bg-surface border-r border-hairline mt-xl">
        <div class="p-container-margin border-b border-hairline bg-surface-soft">
          <h2 class="font-headline-md text-headline-md uppercase tracking-wider mb-xs">NEARBY_UNITS</h2>
          <p class="font-label-sm text-label-sm text-text-muted">SCANNING RADIUS: 5.0KM</p>
        </div>
        <div class="flex-grow overflow-y-auto">
          <MapResult name="ARAL_ULTIMATE" price="1.849" dist="0.8 KM" status="OPERATIONAL" />
          <MapResult name="SHELL_V-POWER" price="1.899" dist="1.2 KM" status="OPERATIONAL" />
          <MapResult name="JET_STATION" price="1.789" dist="2.5 KM" status="PEAK_HOURS" />
          <MapResult name="ESSO_SYNERGY" price="1.829" dist="3.1 KM" status="OPERATIONAL" />
        </div>
        <div class="p-sm bg-surface-soft border-t border-hairline flex justify-between items-center">
          <span class="font-label-sm text-label-sm text-primary uppercase tracking-[2px]">SYNCED_12:04:02</span>
          <div class="flex gap-xs">
            <div class="w-1 h-1 bg-primary rounded-full"></div>
            <div class="w-1 h-1 bg-primary rounded-full"></div>
            <div class="w-1 h-1 bg-primary rounded-full opacity-20"></div>
          </div>
        </div>
      </aside>

      {/* Map Controls */}
      <div class="absolute bottom-container-margin right-container-margin flex flex-col gap-sm z-20">
        <button class="w-12 h-12 bg-surface border border-hairline flex items-center justify-center text-primary hover:bg-surface-soft transition-colors">
          <span class="material-symbols-outlined">add</span>
        </button>
        <button class="w-12 h-12 bg-surface border border-hairline flex items-center justify-center text-primary hover:bg-surface-soft transition-colors">
          <span class="material-symbols-outlined">remove</span>
        </button>
        <button class="w-12 h-12 bg-primary text-background flex items-center justify-center hover:opacity-80 transition-opacity">
          <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">my_location</span>
        </button>
      </div>

      {/* Mobile Results Toggle */}
      <div class="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
        <button class="bg-surface border border-hairline px-md py-xs flex items-center gap-xs rounded-full">
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
  dist: string;
  status: string;
}

const MapResult: Component<MapResultProps> = (props) => {
  return (
    <div class="p-container-margin border-b border-hairline hover:bg-surface-soft transition-colors cursor-pointer group">
      <div class="flex justify-between items-start mb-sm">
        <h3 class="font-headline-md text-headline-md leading-none">{props.name}</h3>
        <span class="font-data-lg text-data-lg text-primary">
          {props.price}<span class="text-[10px] align-top">9</span>
        </span>
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
        <div class="ml-auto">
          <span class="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
