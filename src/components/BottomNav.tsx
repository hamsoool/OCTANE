import { A } from "@solidjs/router";
import type { Component } from "solid-js";
import { getRole } from "../api";

const regularItems: { href: string; icon: string; label: string }[] = [
  { href: "/dashboard", icon: "dashboard", label: "DASHBOARD" },
  { href: "/map", icon: "map", label: "MAP" },
  { href: "/stations", icon: "ev_station", label: "STATIONS" },
];

const adminItems: { href: string; icon: string; label: string }[] = [
  { href: "/admin", icon: "admin_panel_settings", label: "ADMIN" },
  { href: "/map", icon: "map", label: "MAP" },
  { href: "/stations", icon: "ev_station", label: "STATIONS" },
];

const BottomNav: Component = () => {
  const isAdmin = getRole() === "admin";
  const items = isAdmin ? adminItems : regularItems;

  return (
    <nav class="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-xl bg-surface px-4 border-t border-hairline">
      {items.map((item) => (
        <A
          href={item.href}
          class="flex flex-col items-center justify-center transition-opacity"
          activeClass="text-primary"
          inactiveClass="text-on-surface-variant hover:text-primary"
          end
        >
          <span class="material-symbols-outlined mb-1">{item.icon}</span>
          <span class="font-label-sm text-label-sm uppercase tracking-[2.5px]">{item.label}</span>
        </A>
      ))}
    </nav>
  );
};

export default BottomNav;
