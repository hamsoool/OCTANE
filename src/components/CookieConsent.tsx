import { createSignal, onMount, type Component } from "solid-js";

type ConsentLevel = "necessary" | "all" | null;

const STORAGE_KEY = "octane_cookie_consent";

export function getCookieConsent(): ConsentLevel {
  return localStorage.getItem(STORAGE_KEY) as ConsentLevel;
}

const CookieConsent: Component = () => {
  const [visible, setVisible] = createSignal(false);

  onMount(() => {
    if (!getCookieConsent()) {
      setVisible(true);
    }
  });

  const accept = (level: ConsentLevel) => {
    localStorage.setItem(STORAGE_KEY, level!);
    setVisible(false);
  };

  return (
    <div
      classList={{
        "fixed bottom-0 left-0 right-0 z-[100] bg-[#131313] border-t border-[#262626] px-md py-lg md:px-xl transition-transform duration-300": true,
        "translate-y-0": visible(),
        "translate-y-full": !visible(),
      }}
    >
      <div class="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-md">
        <div class="flex-1">
          <p class="font-label-sm text-text-muted uppercase tracking-[2px] text-xs">
            Cookie Consent
          </p>
          <p class="font-body-md text-text-body text-sm mt-xs">
            This site uses cookies to manage your session and personalize your experience.
            <span class="block md:inline md:ml-xs text-text-muted">Necessary cookies are always active. Analytics cookies help us improve.</span>
          </p>
        </div>
        <div class="flex gap-sm shrink-0">
          <button
            onClick={() => accept("necessary")}
            class="font-label-sm uppercase tracking-[2px] text-xs px-lg py-sm rounded-full border border-[#3a3a3a] text-text-muted hover:border-text-body transition-colors"
          >
            Accept Necessary
          </button>
          <button
            onClick={() => accept("all")}
            class="font-label-sm uppercase tracking-[2px] text-xs px-lg py-sm rounded-full bg-white text-black hover:bg-[#cccccc] transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
