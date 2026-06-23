import type { Component, JSX } from "solid-js";
import { Navigate } from "@solidjs/router";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import { getToken } from "../api";

interface AppLayoutProps {
  children: JSX.Element;
}

const AppLayout: Component<AppLayoutProps> = (props) => {
  const token = getToken();
  if (!token) return <Navigate href="/auth" />;

  return (
    <div class="bg-surface text-on-surface min-h-screen font-body-md">
      <TopNav />
      <main class="pb-xl md:pb-0">{props.children}</main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
