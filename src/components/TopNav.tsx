import type { Component } from "solid-js";

type Page = "dashboard" | "watchlist" | "map" | "stations";

interface TopNavProps {
  current: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { page: Page; label: string }[] = [
  { page: "dashboard", label: "DASHBOARD" },
  { page: "watchlist", label: "WATCHLIST" },
  { page: "map", label: "MAP" },
  { page: "stations", label: "STATIONS" },
];

const TopNav: Component<TopNavProps> = (props) => {
  return (
    <header class="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-container-margin h-xl bg-surface border-b border-hairline">
      <div class="font-headline-md text-headline-md tracking-[4px] text-primary uppercase">OCTANE</div>
      <nav class="hidden md:flex gap-lg h-full items-center">
        {navItems.map((item) => (
          <button
            onClick={() => props.onNavigate(item.page)}
            classList={{
              "font-label-md text-label-md uppercase h-full flex items-center px-2 transition-colors": true,
              "text-primary border-b-2 border-primary": props.current === item.page,
              "text-on-surface-variant hover:text-primary": props.current !== item.page,
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <button class="material-symbols-outlined text-primary p-2" data-icon="settings">
        settings
      </button>
    </header>
  );
};

export default TopNav;
