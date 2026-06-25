import { createSignal, onMount, onCleanup, type Component } from "solid-js";
import { isAuthenticated, syncCookiePreferences } from "../api";

const STORAGE_KEY = "octane_cookie_consent";

let openHandler: (() => void) | null = null;

export function requestCookieConsent() {
  openHandler?.();
}

type ParsedConsent =
  | { mode: "all" }
  | { mode: "necessary" }
  | { mode: "custom"; functional: boolean; statistics: boolean; marketing: boolean }
  | null;

export function getCookieConsent(): ParsedConsent {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (!val) return null;
    if (val === "all") return { mode: "all" };
    if (val === "necessary") return { mode: "necessary" };
    const parsed = JSON.parse(val);
    if (typeof parsed === "object" && parsed !== null) {
      return {
        mode: "custom",
        functional: !!parsed.functional,
        statistics: !!parsed.statistics,
        marketing: !!parsed.marketing,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function isCategoryAllowed(
  category: "functional" | "statistics" | "marketing"
): boolean {
  const consent = getCookieConsent();
  if (!consent) return false;
  if (consent.mode === "all") return true;
  if (consent.mode === "necessary") return false;
  return !!consent[category];
}

interface CookiePrefs {
  functional: boolean;
  statistics: boolean;
  marketing: boolean;
}

const defaultPrefs: CookiePrefs = {
  functional: false,
  statistics: false,
  marketing: false,
};

const CookieConsent: Component = () => {
  const [state, setState] = createSignal<"hidden" | "badge" | "card">("hidden");
  const [showPrefs, setShowPrefs] = createSignal(false);
  const [prefs, setPrefs] = createSignal<CookiePrefs>({ ...defaultPrefs });
  const [animating, setAnimating] = createSignal(false);

  onMount(() => {
    openHandler = () => openCard(true);

    if (!getCookieConsent()) {
      setState("badge");
    }
  });

  onCleanup(() => {
    if (openHandler === openCard) openHandler = null;
  });

  const openCard = (animated = false) => {
    if (animated) setAnimating(true);
    setState("card");
  };

  const close = () => {
    setState("badge");
    setShowPrefs(false);
    setAnimating(false);
  };

  const acceptAll = () => {
    localStorage.setItem(STORAGE_KEY, "all");
    if (isAuthenticated()) syncCookiePreferences({ functional: true, statistics: true, marketing: true });
    setState("hidden");
    setShowPrefs(false);
    setAnimating(false);
  };

  const rejectAll = () => {
    localStorage.setItem(STORAGE_KEY, "necessary");
    if (isAuthenticated()) syncCookiePreferences({ functional: false, statistics: false, marketing: false });
    setState("hidden");
    setShowPrefs(false);
    setAnimating(false);
  };

  const savePreferences = () => {
    const p = prefs();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    if (isAuthenticated()) syncCookiePreferences(p);
    setState("hidden");
    setShowPrefs(false);
    setAnimating(false);
  };

  const togglePref = (key: keyof CookiePrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePrefs = () => {
    setShowPrefs((p) => !p);
  };

  return (
    <>
      {state() === "badge" && (
        <button
          onClick={() => openCard()}
          class="fixed bottom-4 left-4 z-[100] w-10 h-10 rounded-full border border-[#3a3a3a] bg-[#131313] flex items-center justify-center hover:border-text-body transition-colors"
          aria-label="Cookie preferences"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999999" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5Z" />
            <circle cx="8" cy="12" r="1" fill="#999999" />
            <circle cx="14" cy="10" r="1" fill="#999999" />
            <circle cx="12" cy="16" r="1" fill="#999999" />
          </svg>
        </button>
      )}

      {state() === "card" && (
        <div
          classList={{
            "fixed bottom-4 left-4 z-[100] w-[92vw] max-w-[420px] bg-[#131313] border border-[#262626]": true,
            "animate-consent-in": animating(),
          }}
        >
          <div class="p-lg">
            <div class="flex items-start justify-between gap-md">
              <p class="font-headline-md text-headline-md text-primary uppercase tracking-[3px]">
                We value your privacy
              </p>
              <button
                onClick={close}
                class="shrink-0 w-6 h-6 flex items-center justify-center rounded-full border border-[#3a3a3a] hover:border-text-body transition-colors mt-[2px]"
                aria-label="Minimize"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999999" stroke-width="2" stroke-linecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p class="font-body-md text-text-body text-sm mt-sm leading-relaxed">
              We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All Cookies," you consent to our use of all cookies.
            </p>
            <p class="font-label-sm text-text-muted text-xs mt-sm uppercase tracking-[1.5px]">
              Manage your preferences or reject non-essential cookies below.
            </p>

            <div class="flex flex-col gap-sm mt-lg">
              <button
                onClick={acceptAll}
                class="w-full font-label-sm uppercase tracking-[2px] text-xs py-sm rounded-full bg-white text-black hover:bg-[#cccccc] transition-colors"
              >
                Accept All
              </button>
              <button
                onClick={rejectAll}
                class="w-full font-label-sm uppercase tracking-[2px] text-xs py-sm rounded-full border border-[#3a3a3a] text-text-muted hover:border-text-body transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={togglePrefs}
                class="w-full font-label-sm uppercase tracking-[2px] text-xs py-sm rounded-full border border-[#3a3a3a] text-text-muted hover:border-text-body transition-colors"
              >
                Preferences
              </button>
            </div>

            {showPrefs() && (
              <div class="mt-md pt-md border-t border-[#262626] space-y-sm">
                <p class="font-label-sm text-text-muted text-xs uppercase tracking-[1.5px] mb-sm">
                  Manage Cookie Preferences
                </p>

                <div class="flex items-center justify-between py-xs">
                  <div class="flex-1">
                    <p class="font-label-sm text-text-body text-xs uppercase tracking-[1.5px]">Strictly Necessary</p>
                    <p class="font-body-md text-text-muted text-[11px] leading-relaxed mt-[2px]">Essential for website functionality. Cannot be disabled.</p>
                  </div>
                  <span class="font-label-sm text-text-muted text-xs uppercase tracking-[1.5px] shrink-0 ml-md">Always Active</span>
                </div>

                <CookieToggle
                  label="Functional"
                  desc="Store user settings like language or location preferences."
                  checked={prefs().functional}
                  onToggle={() => togglePref("functional")}
                />

                <CookieToggle
                  label="Statistics"
                  desc="Collect anonymized data on website usage to help us improve."
                  checked={prefs().statistics}
                  onToggle={() => togglePref("statistics")}
                />

                <CookieToggle
                  label="Marketing"
                  desc="Track user behavior for personalized content and advertisements."
                  checked={prefs().marketing}
                  onToggle={() => togglePref("marketing")}
                />

                <button
                  onClick={savePreferences}
                  class="w-full mt-md font-label-sm uppercase tracking-[2px] text-xs py-sm rounded-full bg-white text-black hover:bg-[#cccccc] transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

interface CookieToggleProps {
  label: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
}

const CookieToggle: Component<CookieToggleProps> = (props) => {
  return (
    <div class="flex items-start justify-between py-xs gap-md">
      <div class="flex-1">
        <p class="font-label-sm text-text-body text-xs uppercase tracking-[1.5px]">{props.label}</p>
        <p class="font-body-md text-text-muted text-[11px] leading-relaxed mt-[2px]">{props.desc}</p>
      </div>
      <button
        onClick={props.onToggle}
        classList={{
          "w-9 h-5 rounded-full border transition-colors relative shrink-0 mt-[2px]": true,
          "bg-white border-white": props.checked,
          "bg-transparent border-[#3a3a3a]": !props.checked,
        }}
      >
        <span
          classList={{
            "absolute top-0.5 w-4 h-4 rounded-full bg-black transition-transform": true,
            "translate-x-4": props.checked,
            "translate-x-0.5": !props.checked,
          }}
        />
      </button>
    </div>
  );
};

export default CookieConsent;
