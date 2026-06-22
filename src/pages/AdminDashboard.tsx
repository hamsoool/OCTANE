import { createSignal, onMount, type Component } from "solid-js";
import { getUsername } from "../api";

interface StatsCardProps {
  label: string;
  value: string;
}

const StatsCard: Component<StatsCardProps> = (props) => (
  <div class="p-lg bg-surface-soft border border-hairline hover:bg-surface-card transition-colors">
    <div class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2.5px] mb-sm">{props.label}</div>
    <div class="font-data-lg text-data-lg text-primary">{props.value}</div>
  </div>
);

const AdminDashboard: Component = () => {
  const [greeting, setGreeting] = createSignal("");

  onMount(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("MORNING");
    else if (h < 18) setGreeting("AFTERNOON");
    else setGreeting("EVENING");
  });

  return (
    <div>
      {/* Hero */}
      <section class="relative w-full h-[320px] md:h-[400px] flex items-end overflow-hidden bg-gradient-to-b from-surface-card to-surface">
        <div class="absolute inset-0 opacity-10 pointer-events-none">
          <div
            class="absolute inset-0"
            style={{
              "background-image": "radial-gradient(circle at 2px 2px, #ffffff 1px, transparent 0)",
              "background-size": "32px 32px",
            }}
          ></div>
        </div>
        <div class="relative z-10 px-container-margin pb-lg w-full max-w-screen-xl mx-auto">
          <div class="flex flex-col gap-xs">
            <span class="font-label-md text-label-md text-ice-blue tracking-[4px] uppercase">Operator Console</span>
            <h1 class="font-headline-xl text-headline-xl text-primary uppercase">Good {greeting()}, {getUsername() || "ADMIN"}.</h1>
            <p class="font-body-md text-body-md text-text-muted max-w-xl">System oversight and user administration terminal.</p>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section class="px-container-margin py-section-gap max-w-screen-xl mx-auto">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l border-hairline">
          <StatsCard label="Total Operators" value="—" />
          <StatsCard label="Administrators" value="—" />
          <StatsCard label="Regular Users" value="—" />
          <StatsCard label="Active Sessions" value="—" />
        </div>
      </section>

      {/* User Management */}
      <section class="px-container-margin max-w-screen-xl mx-auto pb-section-gap">
        <div class="flex items-center justify-between border-b border-hairline-strong pb-md mb-lg">
          <h2 class="font-headline-md text-headline-md text-primary uppercase">Operator Directory</h2>
          <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">Administrator Access</span>
        </div>

        <div class="w-full overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-hairline">
                <th class="py-md pr-md font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">User ID</th>
                <th class="py-md pr-md font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">Username</th>
                <th class="py-md pr-md font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">Email</th>
                <th class="py-md pr-md font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">Role</th>
                <th class="py-md font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-hairline/50">
                <td class="py-md pr-md font-data-sm text-label-sm text-primary font-mono">—</td>
                <td class="py-md pr-md font-body-md text-body-md text-primary">—</td>
                <td class="py-md pr-md font-body-md text-body-md text-text-muted">—</td>
                <td class="py-md pr-md font-label-sm text-label-sm text-text-muted uppercase">—</td>
                <td class="py-md">
                  <span class="font-label-sm text-label-sm text-secondary uppercase tracking-[1px]">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-lg text-center">
          <p class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">
            Live data requires backend API integration
          </p>
        </div>
      </section>

      {/* Action Section */}
      <section class="px-container-margin pb-section-gap max-w-screen-xl mx-auto flex flex-col items-center">
        <div class="w-full h-px bg-hairline mb-section-gap"></div>
        <div class="text-center max-w-xl">
          <h3 class="font-headline-lg text-headline-lg text-primary mb-md uppercase">System Access Log</h3>
          <p class="font-body-md text-body-md text-text-muted mb-lg">
            Review all authentication requests and operator activity across the OCTANE network.
          </p>
          <button class="border border-primary px-xl py-md font-label-md text-label-md text-primary uppercase tracking-[2.5px] rounded-full hover:bg-primary hover:text-background transition-all active:scale-95">
            View Audit Trail
          </button>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
