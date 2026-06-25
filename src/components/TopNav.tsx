import { createSignal, onMount, onCleanup, type Component } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { getUsername, getRole, clearToken, apiPost } from "../api";

const baseNavItems: { href: string; label: string; match: string }[] = [
  { href: "/dashboard", label: "DASHBOARD", match: "dashboard" },
  { href: "/watchlist", label: "WATCHLIST", match: "watchlist" },
  { href: "/map", label: "MAP", match: "map" },
  { href: "/stations", label: "STATIONS", match: "stations" },
];

const adminNavItems: { href: string; label: string; match: string }[] = [
  { href: "/admin", label: "ADMIN", match: "admin" },
  { href: "/watchlist", label: "WATCHLIST", match: "watchlist" },
  { href: "/map", label: "MAP", match: "map" },
  { href: "/stations", label: "STATIONS", match: "stations" },
];

const TopNav: Component = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = createSignal(false);
  const [menuOpen, setMenuOpen] = createSignal(false);
  let menuRef: HTMLDivElement | undefined;

  const handleScroll = () => setScrolled(window.scrollY > 0);

  onMount(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
  });

  onCleanup(() => window.removeEventListener("scroll", handleScroll));

  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef && !menuRef.contains(e.target as Node)) {
      setMenuOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  onCleanup(() => document.removeEventListener("mousedown", handleClickOutside));

  const handleLogout = async () => {
    setMenuOpen(false);
    await apiPost("/auth/logout", {});
    clearToken();
    navigate("/", { replace: true });
  };

  const currentUsername = getUsername();
  const isAdmin = getRole() === "admin";
  const navItems = isAdmin ? adminNavItems : baseNavItems;

  return (
    <header
      classList={{
        "fixed top-0 left-0 w-full z-50 flex justify-end md:justify-center items-center px-container-margin h-xl transition-all duration-300": true,
        "bg-surface border-b border-hairline": scrolled(),
        "bg-transparent border-b border-transparent": !scrolled(),
      }}
    >
      <nav class="hidden md:flex gap-lg h-full items-center">
        {navItems.map((item) => (
          <A
            href={item.href}
            class="font-label-md text-label-md uppercase h-full flex items-center px-2 transition-colors"
            activeClass="text-primary border-b-2 border-primary"
            inactiveClass="text-on-surface-variant hover:text-primary"
            end
          >
            {item.label}
          </A>
        ))}
      </nav>
      <div ref={menuRef} class="relative md:absolute md:right-container-margin md:top-1/2 md:-translate-y-1/2">
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
              <div class="font-data-lg text-data-lg text-primary uppercase">{currentUsername || "—"}</div>
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
