import { Suspense, createSignal, onMount, onCleanup, type Component, type JSX } from "solid-js";
import { Navigate, useNavigate } from "@solidjs/router";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import { checkSession, isAuthenticated, clearToken, apiPost } from "../api";

const IDLE_TIMEOUT = 15 * 60 * 1000;

const ACTIVITY_EVENTS = [
  "mousedown", "keydown", "touchstart", "scroll", "wheel", "visibilitychange",
] as const;

interface AppLayoutProps {
  children: JSX.Element;
}

const AppLayout: Component<AppLayoutProps> = (props) => {
  const navigate = useNavigate();
  const [ready, setReady] = createSignal(false);

  let lastActivity = Date.now();
  let checkInterval: ReturnType<typeof setInterval> | undefined;

  const bumpActivity = () => {
    lastActivity = Date.now();
  };

  const idleLogout = async () => {
    await apiPost("/auth/logout", {});
    clearToken();
    navigate("/auth?reason=timeout", { replace: true });
  };

  onMount(async () => {
    if (!isAuthenticated()) {
      await checkSession();
    }
    setReady(true);

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, bumpActivity, { passive: true })
    );

    checkInterval = setInterval(() => {
      if (Date.now() - lastActivity >= IDLE_TIMEOUT) {
        idleLogout();
      }
    }, 60_000);
  });

  onCleanup(() => {
    ACTIVITY_EVENTS.forEach((ev) =>
      window.removeEventListener(ev, bumpActivity)
    );
    if (checkInterval) clearInterval(checkInterval);
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
