import type { Component } from "solid-js";

type Page = "dashboard" | "watchlist" | "map" | "stations";

interface BottomNavProps {
  current: Page;
  onNavigate: (page: Page) => void;
}

const items: { page: Page; icon: string; label: string }[] = [
  { page: "dashboard", icon: "dashboard", label: "DASHBOARD" },
  { page: "watchlist", icon: "star", label: "WATCHLIST" },
  { page: "map", icon: "map", label: "MAP" },
  { page: "stations", icon: "ev_station", label: "STATIONS" },
];

const BottomNav: Component<BottomNavProps> = (props) => {
  return (
    <nav class="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-xl bg-surface px-4 border-t border-hairline">
      {items.map((item) => (
        <button
          onClick={() => props.onNavigate(item.page)}
          classList={{
            "flex flex-col items-center justify-center transition-opacity": true,
            "text-primary": props.current === item.page,
            "text-on-surface-variant hover:text-primary": props.current !== item.page,
          }}
        >
          <span
            class="material-symbols-outlined mb-1"
            style={props.current === item.page ? { "font-variation-settings": "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : {}}
          >
            {item.icon}
          </span>
          <span class="font-label-sm text-label-sm uppercase tracking-[2.5px]">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
