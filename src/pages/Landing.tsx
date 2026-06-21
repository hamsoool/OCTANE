import { createSignal, onMount, type Component } from "solid-js";

interface LandingProps {
  onEnter: () => void;
}

const Landing: Component<LandingProps> = (props) => {
  const [scrollY, setScrollY] = createSignal(0);
  let placeholderRef: HTMLDivElement | undefined;
  const [octOffset, setOctOffset] = createSignal(300);
  const octProgress = () => Math.min(scrollY() / octOffset(), 1);

  onMount(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });

    const updateOffset = () => {
      if (placeholderRef) {
        const rect = placeholderRef.getBoundingClientRect();
        const docTop = rect.top + window.scrollY;
        // The header vertical center is at 32px (64px / 2).
        // The spacer's vertical center is at docTop + 53 / 2 = docTop + 26.5px.
        // We want the text center to align with spacer center when scrollY is 0.
        // So: 32 + octOffset = docTop + 26.5 => octOffset = docTop - 5.5
        setOctOffset(docTop - 5.5);
      }
    };

    updateOffset();
    window.addEventListener("resize", updateOffset);
    window.addEventListener("load", updateOffset);
    const timer = setTimeout(updateOffset, 100);

    const revealEls = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateOffset);
      window.removeEventListener("load", updateOffset);
      clearTimeout(timer);
      observer.disconnect();
    };
  });

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div class="bg-black text-on-surface">
      {/* Landing Top Nav */}
      <header classList={{
        "fixed top-0 left-0 w-full z-50 flex justify-between items-center px-container-margin h-xl transition-all duration-300": true,
        "bg-black/80 backdrop-blur-sm border-b border-hairline": scrollY() > 0,
        "bg-transparent border-b border-transparent": scrollY() === 0,
      }}>
        <button class="font-label-md text-label-md uppercase hover:opacity-60 transition-opacity">
          MENU
        </button>
        <div
          class="absolute left-1/2"
          style={{
            "font-family": "'Anybody', sans-serif",
            "font-weight": 400,
            color: "#ffffff",
            "text-transform": "uppercase",
            "white-space": "nowrap",
            "font-size": `${48 - octProgress() * 24}px`,
            "line-height": `${1.1 + octProgress() * 0.2}`,
            "letter-spacing": `${4 - octProgress() * 2}px`,
            transform: `translate(-50%, ${Math.max(octOffset() - scrollY(), 0)}px)`,
          }}
        >
          OCTANE
        </div>
        <button
          onClick={props.onEnter}
          class="font-label-md text-label-md uppercase tracking-[2.5px] hover:opacity-60 transition-opacity"
        >
          SIGN IN
        </button>
      </header>

      {/* Hero */}
      <section class="relative h-screen w-full overflow-hidden flex items-center justify-center">
        <div class="absolute inset-0 z-0 overflow-hidden">
          <div
            class="w-full h-[120%] bg-cover bg-center opacity-60"
            style={{
              "background-image":
                "url('/ZAMBALES.png')",
              transform: `translateY(${scrollY() * 0.3}px)`,
            }}
          ></div>
        </div>
        <div class="relative z-10 text-center px-container-margin max-w-4xl">
          <p class="-mt-[10px] font-label-md text-label-md text-text-muted uppercase mb-[8px] reveal">
            A LOCAL PASSION PROJECT
          </p>
          <div ref={placeholderRef} class="h-[53px] mb-[8px]"></div>
          <p class="font-label-md text-label-md text-text-muted mb-lg uppercase reveal">
            Zambales Fuel Price Watchlist
          </p>
          <div class="reveal flex flex-col sm:flex-row items-center justify-center gap-sm">
            <button
              onClick={() => scrollTo("regional-intelligence")}
              class="px-lg py-sm font-label-md text-label-md text-text-muted uppercase tracking-[2.5px] hover:text-primary transition-colors"
            >
              EXPLORE THE SYSTEM
            </button>
            <button
              onClick={props.onEnter}
              class="border border-primary px-lg py-sm font-label-md text-label-md text-primary uppercase tracking-[2.5px] rounded-full hover:bg-primary hover:text-black transition-all duration-300 active:scale-95"
            >
              SIGN IN
            </button>
          </div>
        </div>
        <div class="absolute bottom-md left-1/2 -translate-x-1/2 flex flex-col items-center gap-xs opacity-40">
          <span class="font-label-sm text-label-sm">SCROLL TO NAVIGATE</span>
          <span class="material-symbols-outlined animate-bounce">expand_more</span>
        </div>
      </section>

      {/* Regional Intelligence */}
      <section id="regional-intelligence" class="bg-black py-section-gap px-container-margin overflow-hidden">
        <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-lg items-center">
          <div class="reveal">
            <span class="font-label-sm text-label-sm text-text-muted uppercase mb-xs block">01 / CAPABILITY</span>
            <h2 class="font-headline-lg text-headline-lg text-primary uppercase mb-md">
              REGIONAL<br />INTELLIGENCE
            </h2>
            <p class="font-body-md text-body-md text-text-body mb-lg">
              Our global proprietary sensor network provides millisecond-latency price adjustments across 45,000 nodes,
              ensuring your telemetry remains surgically precise.
            </p>
            <div class="grid grid-cols-2 gap-md border-t border-hairline pt-md">
              <AnimatedCounter value={45.8} suffix="k" label="ACTIVE NODES" />
              <AnimatedCounter value={0.002} suffix="s" label="DATA LATENCY" />
            </div>
          </div>
          <div class="relative h-[400px] md:h-[500px] bg-surface-soft border border-hairline p-md reveal">
            <div class="w-full h-full grayscale opacity-80">
              <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div class="w-full h-px bg-hairline absolute top-1/4"></div>
                <div class="w-full h-px bg-hairline absolute top-1/2"></div>
                <div class="w-full h-px bg-hairline absolute top-3/4"></div>
                <div class="h-full w-px bg-hairline absolute left-1/4"></div>
                <div class="h-full w-px bg-hairline absolute left-1/2"></div>
                <div class="h-full w-px bg-hairline absolute left-3/4"></div>
              </div>
              <div class="relative z-10 flex flex-col gap-sm p-md">
                <div class="p-xs bg-black border border-hairline w-fit">
                  <span class="font-label-sm text-[8px] text-white">LAT: 52.5200° N</span>
                </div>
                <div class="p-xs bg-black border border-hairline w-fit">
                  <span class="font-label-sm text-[8px] text-white">LNG: 13.4050° E</span>
                </div>
              </div>
              <div class="absolute bottom-md right-md flex items-end gap-xs">
                <span class="font-label-sm text-label-sm text-text-muted">SYSTEM ONLINE</span>
                <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Station Fidelity */}
      <section class="bg-black pb-section-gap px-container-margin">
        <div class="max-w-7xl mx-auto">
          <div class="flex flex-col md:flex-row justify-between items-end mb-xl reveal">
            <div class="flex-1">
              <span class="font-label-sm text-label-sm text-text-muted uppercase mb-xs block">02 / INTERFACE</span>
              <h2 class="font-headline-lg text-headline-lg text-primary uppercase mb-md">
                STATION FIDELITY
              </h2>
              <p class="font-body-md text-body-md text-text-body">
                High-contrast data cards optimized for rapid visual acquisition while in motion. Every value is validated
                via triple-node consensus.
              </p>
            </div>
            <button class="hidden md:block font-label-md text-label-md uppercase underline underline-offset-8 decoration-hairline hover:decoration-white transition-all">
              VIEW LIVE FEED
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-sm reveal">
            {[
              { name: "SHELL V-POWER", grade: "OCTANE 98", price: "1.942", delta: -0.004, down: true },
              { name: "ARAL ULTIMATE", grade: "OCTANE 102", price: "2.018", delta: 0, down: false },
              { name: "TOTAL EXCELLIUM", grade: "DIESEL PREM", price: "1.829", delta: -0.012, down: true },
            ].map((s) => (
              <div class="bg-surface-card p-md border-t border-hairline group hover:bg-surface-container transition-colors">
                <div class="flex justify-between items-start mb-lg">
                  <h3 class="font-headline-md text-headline-md text-primary uppercase">{s.name}</h3>
                  <span class="material-symbols-outlined text-text-muted group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                    north_east
                  </span>
                </div>
                <div class="mb-sm">
                  <span class="font-label-sm text-label-sm text-text-muted block">{s.grade}</span>
                  <div class="font-data-lg text-[48px] text-primary">{s.price}</div>
                </div>
                <div
                  classList={{
                    "flex justify-between items-center": true,
                    "text-ice-blue": s.down,
                    "text-text-muted": !s.down,
                  }}
                >
                  <span class="font-label-sm text-label-sm">
                    {s.down ? `PRICE DELTA ${s.delta}` : "STABLE POSITION"}
                  </span>
                  <span class="material-symbols-outlined text-sm">
                    {s.down ? "trending_down" : "remove"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pre-footer Photo Band */}
      <section class="relative py-section-gap w-full flex items-center justify-center overflow-hidden">
        <div class="absolute inset-0 z-0">
          <div
            class="w-full h-full bg-cover bg-fixed bg-center opacity-40"
            style={{
              "background-image":
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAcmUqoxSXeKzCJ-edOmC6Opkaj2DqlzjeqS9z0oML2MoIdWFPyz4Z86irvzgTOGXs0IBN0bPdwtXyfhdyBmWVLQufPqyo_BC2vbEcjq80eBeOIDM_R4aoK9KlW0Wxj_qsm230SOX9s0Vgh2QSs0ZqH8_OTZDRmz1nz1QUlr6FHV2TLd-QPKHmr69MNyBBBBVFnBSDh8K-Y5YJCqPYbQWSsQ-MGqEQ2QHx-abyqTWk3umCNsdF13YlKeRTvCjfCM60ycyJ0g5K6g48')",
            }}
          ></div>
        </div>
        <div class="relative z-10 text-center px-container-margin py-xl max-w-3xl">
          <h2 class="font-headline-lg text-headline-lg text-primary uppercase mb-md reveal">
            ENGINEERED FOR THE DISCERNING MOTORIST
          </h2>
          <div class="reveal">
            <button
              onClick={props.onEnter}
              class="border border-primary px-lg py-sm font-label-md text-label-md text-primary uppercase tracking-[2.5px] rounded-full hover:bg-primary hover:text-black transition-all duration-300 active:scale-95"
            >
              SIGN IN
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer class="bg-black py-xl px-container-margin border-t border-hairline">
        <div class="max-w-7xl mx-auto flex flex-col gap-xl">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
            <div class="flex flex-col gap-xs">
              <button
                onClick={props.onEnter}
                class="font-label-md text-label-md text-text-muted hover:text-white transition-colors text-left"
              >
                WATCHLIST
              </button>
              <button
                onClick={props.onEnter}
                class="font-label-md text-label-md text-text-muted hover:text-white transition-colors text-left"
              >
                STATIONS
              </button>
              <button
                onClick={props.onEnter}
                class="font-label-md text-label-md text-text-muted hover:text-white transition-colors text-left"
              >
                INTELLIGENCE
              </button>
            </div>
            <div class="flex flex-col gap-xs md:text-right">
              <span class="font-label-md text-label-md text-text-muted">LEGAL/TERMS</span>
              <span class="font-label-md text-label-md text-text-muted">PRIVACY POLICY</span>
              <span class="font-label-md text-label-md text-text-muted">© 2024 OCTANE GLOBAL</span>
            </div>
          </div>
          <div class="pt-xl flex justify-center border-t border-hairline overflow-hidden">
            <h2 class="font-headline-xl text-[120px] md:text-[200px] leading-none text-surface-container font-extrabold uppercase select-none pointer-events-none tracking-[-0.05em] opacity-30">
              OCTANE
            </h2>
          </div>
        </div>
      </footer>

      <style>{`
        .reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};

const AnimatedCounter: Component<{ value: number; suffix: string; label: string }> = (props) => {
  const [display, setDisplay] = createSignal("");
  let ref: HTMLDivElement | undefined;

  onMount(() => {
    if (!ref) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          let current = 0;
          const end = props.value;
          const duration = 1200;
          const step = Math.max(end / 60, 0.001);
          const timer = setInterval(() => {
            current += step;
            if (current >= end) {
              setDisplay(end + props.suffix);
              clearInterval(timer);
            } else {
              setDisplay(current.toFixed(props.value < 1 ? 3 : 1) + props.suffix);
            }
          }, duration / 60);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(ref);
  });

  return (
    <div ref={ref}>
      <div class="font-data-lg text-data-lg text-primary mb-xs">{display() || "—"}</div>
      <div class="font-label-sm text-label-sm text-text-muted uppercase">{props.label}</div>
    </div>
  );
};

export default Landing;
