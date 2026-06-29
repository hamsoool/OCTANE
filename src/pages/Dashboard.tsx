import { createSignal, createEffect, onMount, onCleanup, For, type Component } from "solid-js";
import { apiGet } from "../api";

const LOCATIONS = [
  { image: "/OLONGAPO.png", name: "OLONGAPO CITY" },
  { image: "/SUBIC.png", name: "MUNICIPALITY OF SUBIC" },
  { image: "/CASTILLEJOS.png", name: "MUNICIPALITY OF CASTILLEJOS" },
];

interface TopStation {
  stationId: string;
  name: string;
  brand?: string;
  userCount: number;
  avgDiesel: number;
  coordinates: [number, number];
}

interface TrendData {
  amount: string;
  pct: string;
  direction: string;
  formatted: string;
}

const Dashboard: Component = () => {
  const [currentImage, setCurrentImage] = createSignal(0);
  const [manilaTime, setManilaTime] = createSignal("");
  const [topStations, setTopStations] = createSignal<TopStation[]>([]);
  const [trend, setTrend] = createSignal<TrendData | null>(null);

  const [displayedName, setDisplayedName] = createSignal("");

  createEffect(() => {
    const name = LOCATIONS[currentImage()].name;
    let currentText = "";
    let currentIndex = 0;
    setDisplayedName("");
    const id = setInterval(() => {
      if (currentIndex < name.length) {
        currentText += name[currentIndex];
        setDisplayedName(currentText);
        currentIndex++;
      } else {
        clearInterval(id);
      }
    }, 60);
    onCleanup(() => clearInterval(id));
  });

  onMount(async () => {
    const res = await apiGet<TopStation[]>("/saved-stations/top");
    if (res.success && res.data) {
      setTopStations(res.data);
    }
    const trendRes = await apiGet<TrendData>("/stations/trends");
    if (trendRes.success && trendRes.data) {
      setTrend(trendRes.data);
    }
  });

  createEffect(() => {
    const update = () => {
      const now = new Date();
      const manila = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      setManilaTime(manila.toLocaleTimeString("en-US", { hour12: false }));
    };
    update();
    const id = setInterval(update, 1000);
    onCleanup(() => clearInterval(id));
  });

  createEffect(() => {
    const id = setInterval(() => {
      setCurrentImage((i) => (i === LOCATIONS.length - 1 ? 0 : i + 1));
    }, 12000);
    onCleanup(() => clearInterval(id));
  });

  const prevImage = () => setCurrentImage((i) => (i === 0 ? LOCATIONS.length - 1 : i - 1));
  const nextImage = () => setCurrentImage((i) => (i === LOCATIONS.length - 1 ? 0 : i + 1));

  return (
    <div>
      {/* Hero Section */}
      <section class="relative w-full h-[600px] md:h-[716px] flex items-end overflow-hidden">
        <div class="absolute inset-0 z-0">
          <For each={LOCATIONS}>
            {(loc: { image: string; name: string }, idx: () => number) => (
              <div
                class="absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out"
                style={{
                  "background-image": `url('${loc.image}')`,
                  opacity: currentImage() === idx() ? 1 : 0,
                  "z-index": currentImage() === idx() ? 1 : 0,
                }}
              ></div>
            )}
          </For>
          <div class="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent z-10"></div>
        </div>

        {/* Left Arrow */}
        <button
          onClick={prevImage}
          class="absolute md:fixed left-0 top-0 bottom-0 z-20 w-12 md:w-20 flex items-center justify-center text-white/30 md:text-white/20 hover:text-ice-blue group cursor-pointer transition-all duration-500"
        >
          <div class="absolute inset-y-4 md:inset-y-8 right-0 w-px bg-white/0 group-hover:bg-ice-blue/30 transition-all duration-500 hidden md:block"></div>
          <div class="absolute inset-0 bg-white/0 group-hover:bg-white/[0.03] transition-all duration-500 hidden md:block"></div>
          <span class="material-symbols-outlined text-[20px] md:text-[28px] relative animate-arrow-left">arrow_back</span>
        </button>

        {/* Right Arrow */}
        <button
          onClick={nextImage}
          class="absolute md:fixed right-0 top-0 bottom-0 z-20 w-12 md:w-20 flex items-center justify-center text-white/30 md:text-white/20 hover:text-ice-blue group cursor-pointer transition-all duration-500"
        >
          <div class="absolute inset-y-4 md:inset-y-8 left-0 w-px bg-white/0 group-hover:bg-ice-blue/30 transition-all duration-500 hidden md:block"></div>
          <div class="absolute inset-0 bg-white/0 group-hover:bg-white/[0.03] transition-all duration-500 hidden md:block"></div>
          <span class="material-symbols-outlined text-[20px] md:text-[28px] relative animate-arrow-right">arrow_forward</span>
        </button>

        <div class="relative z-10 px-container-margin pb-lg w-full max-w-screen-2xl mx-auto">
          <div class="flex flex-col gap-xs">
            <h1 class="font-headline-lg md:font-headline-xl text-headline-lg md:text-headline-xl text-primary max-w-2xl leading-tight md:leading-none uppercase md:whitespace-nowrap">
              {displayedName()}
              <span class="animate-pulse text-ice-blue select-none ml-1">_</span>
            </h1>
          </div>
        </div>
      </section>

      <style>{`
        .animate-arrow-left {
          animation: arrow-nudge-left 3s ease-in-out infinite;
        }
        .animate-arrow-right {
          animation: arrow-nudge-right 3s ease-in-out infinite;
        }
        @keyframes arrow-nudge-left {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        @keyframes arrow-nudge-right {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-4px); }
        }
      `}</style>

      {/* Regional Trend Indicator */}
      <section class="px-container-margin py-6 md:py-section-gap w-full max-w-screen-2xl mx-auto">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-hairline-strong pb-md gap-md">
          <div>
            <h2 class="font-label-md text-label-md text-text-muted uppercase tracking-[2.5px] mb-xs">Weekly Trend (All Grades)</h2>
            <div class="flex items-baseline gap-sm">
              <span class="font-data-lg text-[36px] md:text-[48px] text-primary leading-none tracking-tighter">
                {trend() ? `${trend()!.direction === "down" ? "-" : trend()!.direction === "up" ? "+" : ""}₱${trend()!.amount}` : "—"}
              </span>
              {trend() && (
                <span
                  classList={{
                    "font-label-sm text-label-sm px-2 py-1 uppercase flex items-center gap-xs": true,
                    "text-ice-blue bg-secondary-container": trend()!.direction === "down",
                    "text-red-400 bg-error-container": trend()!.direction === "up",
                    "text-text-muted bg-surface-soft": trend()!.direction === "stable",
                  }}
                >
                  <span class="material-symbols-outlined text-sm">
                    {trend()!.direction === "up" ? "trending_up" : trend()!.direction === "down" ? "trending_down" : "trending_flat"}
                  </span>
                  {trend()!.direction === "up" ? "+" : trend()!.direction === "down" ? "-" : ""}{trend()!.pct}%
                </span>
              )}
            </div>
          </div>
          <div class="flex flex-col gap-unit text-right">
            <span class="font-label-sm text-label-sm text-text-muted uppercase">Philippine Time</span>
            <span class="font-data-lg text-data-lg text-primary uppercase">{manilaTime()}</span>
          </div>
        </div>
      </section>

      {/* Stational Benchmarks */}
      <section class="px-container-margin pb-6 md:pb-section-gap w-full max-w-screen-2xl mx-auto">
        <h3 class="font-headline-md text-headline-md text-primary mb-3 md:mb-lg uppercase">Stational Benchmarks</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l border-hairline">
          {topStations().length === 0 && (
            <div class="col-span-full p-lg bg-surface-soft border-r border-b border-hairline">
              <span class="font-label-sm text-label-sm text-text-muted uppercase">No benchmark data available</span>
            </div>
          )}
          {topStations().map((s) => (
            <StationCard
              name={s.name}
              brand={s.brand ?? s.name}
              avgDiesel={s.avgDiesel}
              pct={s.pct}
              direction={s.direction}
            />
          ))}
        </div>
      </section>

    </div>
  );
};

interface TopStation {
  stationId: string;
  name: string;
  brand?: string;
  userCount: number;
  avgDiesel: number;
  coordinates: [number, number];
  pct?: string;
  direction?: string;
}

interface StationCardProps {
  name: string;
  brand: string;
  avgDiesel: number;
  pct?: string;
  direction?: string;
}

const StationCard: Component<StationCardProps> = (props) => {
  const isIncrease = () => props.direction === "up";
  const isDecrease = () => props.direction === "down";

  return (
    <div class="p-lg bg-surface-soft border-r border-b border-hairline hover:bg-surface-card transition-colors group flex flex-col justify-between">
      <div class="flex justify-between items-center w-full mb-lg min-w-0">
        <div class="marquee-container mr-2">
          <div class="marquee-scroller">
            <span class="marquee-text font-label-md text-[18px] md:text-[22px] text-primary uppercase tracking-[2px]">{props.name}</span>
          </div>
        </div>
        <span class="material-symbols-outlined text-text-muted group-hover:text-primary transition-colors text-[24px] shrink-0">local_gas_station</span>
      </div>
      <div class="flex items-center justify-between w-full">
        <div class="flex flex-col gap-xs">
          <span class="font-data-lg text-[32px] md:text-[40px] text-primary leading-none">
            ₱{props.avgDiesel.toFixed(2)}
          </span>
          <span class="font-label-sm text-[10px] text-text-muted uppercase tracking-[2px]">AVG DIESEL</span>
        </div>
        {props.pct && props.pct !== "0.00" && (
          <div class="flex flex-col items-center gap-unit">
            <span
              classList={{
                "font-label-sm text-[11px] inline-flex items-center justify-center gap-xs px-xs py-[2px] rounded-none border": true,
                "text-ice-blue border-ice-blue/20 bg-ice-blue/5": isDecrease(),
                "text-red-400 border-red-400/20 bg-red-400/5": isIncrease(),
              }}
            >
              <span class="material-symbols-outlined text-[14px]">
                {isIncrease() ? "trending_up" : isDecrease() ? "trending_down" : "remove"}
              </span>
              {props.pct}%
            </span>
            <span class="font-label-sm text-[9px] text-text-muted opacity-60 uppercase tracking-[1px] text-center">
              VS LAST WEEK
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
