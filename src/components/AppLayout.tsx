import { Suspense, createSignal, onMount, type Component, type JSX } from "solid-js";
import { Navigate } from "@solidjs/router";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import { checkSession, isAuthenticated } from "../api";

interface AppLayoutProps {
  children: JSX.Element;
}

const AppLayout: Component<AppLayoutProps> = (props) => {
  const [ready, setReady] = createSignal(false);

  onMount(async () => {
    if (!isAuthenticated()) {
      await checkSession();
    }
    setReady(true);
  });

  return (
    <div class="bg-surface text-on-surface min-h-screen font-body-md">
      {ready() ? (
        isAuthenticated() ? (
          <>
            <TopNav />
            <main class="pb-xl md:pb-0">
              <Suspense fallback={<div class="flex items-center justify-center h-64"><div class="font-label-md text-label-sm text-text-muted uppercase tracking-[2.5px]">Loading...</div></div>}>
                {props.children}
              </Suspense>
            </main>
            <BottomNav />
          </>
        ) : (
          <Navigate href="/auth" />
        )
      ) : (
        <div class="flex items-center justify-center h-screen">
          <div class="font-label-md text-label-sm text-text-muted uppercase tracking-[2.5px]">Loading...</div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
