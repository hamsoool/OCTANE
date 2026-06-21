import type { Component } from "solid-js";

const Dashboard: Component = () => {
  return (
    <div>
      {/* Hero Section */}
      <section class="relative w-full h-[600px] md:h-[716px] flex items-end overflow-hidden">
        <div class="absolute inset-0 z-0">
          <div class="w-full h-full bg-cover bg-center" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAfgB_lC5fEeCuk-DbyXQVcWl3HgG5RUxdljvcwFJh3TrRn4V3YqdRocJ2fxrGnSYqCd90mkeehmYOws_VJKsVfJW6ythEg-S7GMmvu9hZWx3V15DKohtLj6JkjlJrH67zhGhehFt1gTW_G8_xSh5y7KxuOYs_i2G7ZTq2QUk5ByN8f-pjmWt16aEm5tFGXRLZC6ryo2lFJq8_gcXu5G8fiiP4W-IJsjbmerOZHgfQPi_ca-T9HQRPAxN6I1wsTX19i_2CD9089b-U')"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
        </div>
        <div class="relative z-10 px-container-margin pb-lg w-full max-w-screen-xl mx-auto">
          <div class="flex flex-col gap-xs">
            <span class="font-label-md text-label-md text-primary tracking-[4px] uppercase opacity-60">Status: Real-Time</span>
            <h1 class="font-headline-xl text-headline-xl text-primary max-w-2xl leading-none">PRECISION FUEL DATA.</h1>
          </div>
        </div>
      </section>

      {/* Global Trend Indicator */}
      <section class="px-container-margin py-section-gap max-w-screen-xl mx-auto">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-hairline-strong pb-md gap-md">
          <div>
            <h2 class="font-label-md text-label-md text-text-muted uppercase tracking-[2.5px] mb-xs">Global Market Trend</h2>
            <div class="flex items-baseline gap-sm">
              <span class="font-data-lg text-[48px] text-primary leading-none tracking-tighter">-$0.12</span>
              <span class="font-label-sm text-label-sm text-secondary bg-secondary-container px-2 py-1 uppercase">Price Down</span>
            </div>
          </div>
          <div class="flex flex-col gap-unit text-right">
            <span class="font-label-sm text-label-sm text-text-muted uppercase">Last Sync</span>
            <span class="font-data-lg text-data-lg text-primary uppercase">14:22:05 UTC</span>
          </div>
        </div>
      </section>

      {/* Regional Grid */}
      <section class="px-container-margin max-w-screen-xl mx-auto pb-section-gap">
        <h3 class="font-headline-md text-headline-md text-primary mb-lg uppercase">Regional Benchmarks</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l border-hairline">
          <RegionCard name="California" price="$4.82" fuel="Premium Unocal" trend="trending_down" />
          <RegionCard name="Texas" price="$3.14" fuel="Midgrade Ethanol" trend="trending_flat" />
          <RegionCard name="New York" price="$3.98" fuel="Standard Ultra" trend="trending_up" />
          <RegionCard name="Florida" price="$3.45" fuel="Premium Plus" trend="trending_down" />
        </div>
      </section>

      {/* Action Section */}
      <section class="px-container-margin pb-section-gap max-w-screen-xl mx-auto flex flex-col items-center">
        <div class="w-full h-px bg-hairline mb-section-gap"></div>
        <div class="text-center max-w-xl">
          <h4 class="font-headline-lg text-headline-lg text-primary mb-md uppercase">Telemetry Export</h4>
          <p class="font-body-md text-body-md text-text-muted mb-lg">
            Download comprehensive regional pricing reports and market analysis directly to your encrypted station portal.
          </p>
          <button class="border border-primary px-xl py-md font-label-md text-label-md text-primary uppercase tracking-[2.5px] rounded-full hover:bg-primary hover:text-background transition-all active:scale-95">
            Execute Report
          </button>
        </div>
      </section>
    </div>
  );
};

interface RegionCardProps {
  name: string;
  price: string;
  fuel: string;
  trend: string;
}

const RegionCard: Component<RegionCardProps> = (props) => {
  return (
    <div class="p-lg bg-surface-soft border-r border-b border-hairline hover:bg-surface-card transition-colors group">
      <div class="flex justify-between items-start mb-md">
        <span class="font-label-md text-label-md text-text-muted uppercase tracking-[2.5px]">{props.name}</span>
        <span class="material-symbols-outlined text-text-muted group-hover:text-primary transition-colors">{props.trend}</span>
      </div>
      <div class="font-data-lg text-data-lg text-primary mb-xs">{props.price}</div>
      <div class="font-label-sm text-label-sm text-text-muted uppercase">{props.fuel}</div>
    </div>
  );
};

export default Dashboard;
