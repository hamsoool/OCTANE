import { createSignal, createEffect, onMount, onCleanup, type Component } from "solid-js";
import { apiGet } from "../api";

const LOCATIONS = [
  { image: "/OLONGAPO.png", name: "OLONGAPO CITY" },
  { image: "/SUBIC.png", name: "MUNICIPALITY OF SUBIC" },
  { image: "/CASTILLEJOS.png", name: "MUNICIPALITY OF CASTILLEJOS" },
];

const Dashboard: Component = () => {
  const [currentImage, setCurrentImage] = createSignal(0);
  const [manilaTime, setManilaTime] = createSignal("");
  const [topStations, setTopStations] = createSignal<TopStation[]>([]);

  onMount(async () => {
    const res = await apiGet<TopStation[]>("/saved-stations/top");
    if (res.success && res.data) {
      setTopStations(res.data);
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

  const prevImage = () => setCurrentImage((i) => (i === 0 ? LOCATIONS.length - 1 : i - 1));
  const nextImage = () => setCurrentImage((i) => (i === LOCATIONS.length - 1 ? 0 : i + 1));

  return (
    <div>
      {/* Hero Section */}
      <section class="relative w-full h-[600px] md:h-[716px] flex items-end overflow-hidden">
        <div class="absolute inset-0 z-0">
          <div
            class="w-full h-full bg-cover bg-center transition-all duration-700"
            style={`background-image: url('${LOCATIONS[currentImage()].image}')`}
          ></div>
          <div class="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
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
            <span class="font-label-md text-label-md text-primary tracking-[4px] uppercase opacity-60">Status: Real-Time</span>
            <h1 class="font-headline-lg md:font-headline-xl text-headline-lg md:text-headline-xl text-primary max-w-2xl leading-tight md:leading-none uppercase md:whitespace-nowrap">
              {LOCATIONS[currentImage()].name}
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

      {/* Global Trend Indicator */}
      <section class="px-container-margin py-6 md:py-section-gap w-full max-w-screen-2xl mx-auto">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-hairline-strong pb-md gap-md">
          <div>
            <h2 class="font-label-md text-label-md text-text-muted uppercase tracking-[2.5px] mb-xs">Global Market Trend</h2>
            <div class="flex items-baseline gap-sm">
              <span class="font-data-lg text-[48px] text-primary leading-none tracking-tighter">-$0.12</span>
              <span class="font-label-sm text-label-sm text-secondary bg-secondary-container px-2 py-1 uppercase">Price Down</span>
            </div>
          </div>
          <div class="flex flex-col gap-unit text-right">
            <span class="font-label-sm text-label-sm text-text-muted uppercase">Manila Time</span>
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
}

interface StationCardProps {
  name: string;
  brand: string;
  avgDiesel: number;
}

const StationCard: Component<StationCardProps> = (props) => {
  return (
    <div class="p-lg bg-surface-soft border-r border-b border-hairline hover:bg-surface-card transition-colors group">
      <div class="flex justify-between items-start mb-md">
        <span class="font-label-md text-label-md text-text-muted uppercase tracking-[2.5px] truncate mr-2">{props.name}</span>
        <span class="material-symbols-outlined text-text-muted group-hover:text-primary transition-colors text-[18px]">local_gas_station</span>
      </div>
      <div class="font-data-lg text-[48px] text-primary leading-none tracking-tighter mb-unit">₱{props.avgDiesel.toFixed(2)}</div>
      <span class="font-label-sm text-label-sm text-text-muted uppercase">AVG DIESEL</span>
    </div>
  );
};

export default Dashboard;
