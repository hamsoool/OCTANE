import { createSignal, onCleanup, type Component } from "solid-js";
import { getOperatorId, clearToken } from "../api";

type Page = "dashboard" | "watchlist" | "map" | "stations";

interface TopNavProps {
  current: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

const navItems: { page: Page; label: string }[] = [
  { page: "dashboard", label: "DASHBOARD" },
  { page: "watchlist", label: "WATCHLIST" },
  { page: "map", label: "MAP" },
  { page: "stations", label: "STATIONS" },
];

const TopNav: Component<TopNavProps> = (props) => {
  const [menuOpen, setMenuOpen] = createSignal(false);
  let menuRef: HTMLDivElement | undefined;

  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef && !menuRef.contains(e.target as Node)) {
      setMenuOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  onCleanup(() => document.removeEventListener("mousedown", handleClickOutside));

  const handleLogout = () => {
    setMenuOpen(false);
    clearToken();
    props.onLogout();
  };

  const operatorId = getOperatorId();

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
      <div ref={menuRef} class="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen())}
          class="material-symbols-outlined text-primary p-2"
        >
          settings
        </button>
        {menuOpen() && (
          <div class="absolute right-0 top-full mt-xs w-56 bg-surface-card border border-hairline p-md z-50">
            <div class="mb-md">
              <div class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px] mb-xs">Operator</div>
              <div class="font-data-lg text-data-lg text-primary uppercase">{operatorId || "—"}</div>
            </div>
            <div class="h-px bg-hairline mb-md"></div>
            <button
              onClick={handleLogout}
              class="w-full h-10 border border-hairline-strong text-primary font-label-md text-label-md uppercase tracking-[2.5px] rounded-full hover:bg-hairline transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopNav;
