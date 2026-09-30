import { createSignal, createEffect, onMount, For, Show, type Component } from "solid-js";
import { Navigate } from "@solidjs/router";
import { apiGet, getUsername, getRole } from "../api";

interface AuditEntry {
  _id: string;
  username: string;
  role: string;
  action: string;
  outcome: "success" | "failure";
  target?: string;
  ip?: string;
  createdAt: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  pages: number;
}

// Mirrors AUDIT_ACTIONS in server/src/utils/audit.ts
const ACTION_FILTERS = [
  "",
  "SIGNED_IN",
  "SIGNED_OUT",
  "SIGNIN_FAILED",
  "ACCOUNT_LOCKED",
  "REGISTERED",
  "VERIFIED",
  "VERIFY_FAILED",
  "VERIFICATION_CODE_SENT",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "PASSWORD_CHANGED",
  "PASSWORD_CHANGE_FAILED",
  "COOKIE_CONSENT_UPDATED",
  "STATION_SAVED",
  "STATION_REMOVED",
  "PROFILE_UPDATED",
  "AUDIT_LOG_VIEWED",
];

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const AdminDashboard: Component = () => {
  const role = getRole();
  if (role !== "admin") return <Navigate href="/dashboard" />;

  const [greeting, setGreeting] = createSignal("");
  const [entries, setEntries] = createSignal<AuditEntry[]>([]);
  const [total, setTotal] = createSignal(0);
  const [page, setPage] = createSignal(1);
  const [pages, setPages] = createSignal(1);
  const [actionFilter, setActionFilter] = createSignal("");
  const [usernameFilter, setUsernameFilter] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");

  onMount(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("MORNING");
    else if (h < 18) setGreeting("AFTERNOON");
    else setGreeting("EVENING");
  });

  async function loadLog(targetPage: number, action: string, username: string) {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ page: String(targetPage), limit: "50" });
    if (action) params.set("action", action);
    if (username) params.set("username", username);

    const res = await apiGet<AuditResponse>(`/audit?${params.toString()}`);

    if (res.success && res.data) {
      // A filter change can strand the viewer past the last page.
      if (targetPage > res.data.pages) {
        setPage(res.data.pages);
        return;
      }
      setEntries(res.data.entries);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setPage(res.data.page);
    } else {
      setError(res.error || "Failed to load audit log.");
    }
    setLoading(false);
  }

  // Single source of truth for fetching: any change to page or a filter refetches.
  createEffect(() => {
    void loadLog(page(), actionFilter(), usernameFilter());
  });

  function applyFilter(action: string, username: string) {
    setActionFilter(action);
    setUsernameFilter(username);
    setPage(1);
  }

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
            <p class="font-body-md text-body-md text-text-muted max-w-xl">Audit log of operator activity across the OCTANE network.</p>
          </div>
        </div>
      </section>

      {/* Log Summary */}
      <section class="px-container-margin py-section-gap max-w-screen-xl mx-auto">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-0 border-t border-l border-hairline">
          <div class="p-lg bg-surface-soft border border-hairline">
            <div class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2.5px] mb-sm">Total Entries</div>
            <div class="font-data-lg text-data-lg text-primary">{loading() ? "—" : total()}</div>
          </div>
          <div class="p-lg bg-surface-soft border border-hairline">
            <div class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2.5px] mb-sm">Page</div>
            <div class="font-data-lg text-data-lg text-primary">{loading() ? "—" : `${page()} / ${pages()}`}</div>
          </div>
          <div class="p-lg bg-surface-soft border border-hairline">
            <div class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2.5px] mb-sm">Action Filter</div>
            <div class="font-data-lg text-data-lg text-primary">{actionFilter() || "ALL"}</div>
          </div>
          <div class="p-lg bg-surface-soft border border-hairline">
            <div class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2.5px] mb-sm">Operator Filter</div>
            <div class="font-data-lg text-data-lg text-primary">{usernameFilter() || "ALL"}</div>
          </div>
        </div>
      </section>

      {/* Audit Log */}
      <section class="px-container-margin max-w-screen-xl mx-auto pb-section-gap">
        <div class="flex items-center justify-between border-b border-hairline-strong pb-md mb-lg">
          <h2 class="font-headline-md text-headline-md text-primary uppercase">Activity Log</h2>
          <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">Administrator Access</span>
        </div>

        {/* Filters */}
        <div class="flex flex-col md:flex-row gap-xs md:gap-sm mb-lg">
          <select
            aria-label="Filter by action"
            value={actionFilter()}
            onChange={(e) => applyFilter(e.currentTarget.value, usernameFilter())}
            class="bg-surface-soft border border-hairline text-primary font-label-sm text-label-sm uppercase tracking-[2px] px-md py-sm rounded-full focus:border-ice-blue focus:outline-none"
          >
            <For each={ACTION_FILTERS}>
              {(action) => <option value={action}>{action || "ALL ACTIONS"}</option>}
            </For>
          </select>

          <input
            type="text"
            aria-label="Filter by operator"
            placeholder="OPERATOR"
            value={usernameFilter()}
            onInput={(e) => applyFilter(actionFilter(), e.currentTarget.value.toUpperCase())}
            class="bg-surface-soft border border-hairline text-primary font-label-sm text-label-sm uppercase tracking-[2px] px-md py-sm rounded-full placeholder:text-text-muted focus:border-ice-blue focus:outline-none"
          />

          <Show when={actionFilter() || usernameFilter()}>
            <button
              onClick={() => applyFilter("", "")}
              class="border border-hairline-strong px-md py-sm font-label-sm text-label-sm text-text-muted uppercase tracking-[2px] rounded-full hover:border-primary hover:text-primary transition-colors"
            >
              [Clear]
            </button>
          </Show>
        </div>

        <Show
          when={!error()}
          fallback={
            <div class="py-lg text-center">
              <p class="font-body-md text-body-md text-text-muted mb-md">{error()}</p>
              <button
                onClick={() => void loadLog(page(), actionFilter(), usernameFilter())}
                class="border border-primary px-xl py-md font-label-md text-label-md text-primary uppercase tracking-[2.5px] rounded-full hover:bg-primary hover:text-background transition-all active:scale-95"
              >
                [Retry_Connection]
              </button>
            </div>
          }
        >
          <Show
            when={!loading()}
            fallback={
              <div class="py-lg text-center font-label-md text-label-md text-ice-blue uppercase tracking-[4px]">
                Retrieving log...
              </div>
            }
          >
            <div class="w-full overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-hairline">
                    <th class="py-md pr-md font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">Timestamp</th>
                    <th class="py-md pr-md font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">Operator</th>
                    <th class="py-md pr-md font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">Action</th>
                    <th class="py-md pr-md font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">Outcome</th>
                    <th class="py-md font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  <Show
                    when={entries().length > 0}
                    fallback={
                      <tr class="border-b border-hairline/50">
                        <td colspan="5" class="py-lg text-center font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">
                          No entries match the current filters.
                        </td>
                      </tr>
                    }
                  >
                    <For each={entries()}>
                      {(entry) => (
                        <tr class="border-b border-hairline/50">
                          <td class="py-md pr-md font-label-sm text-label-sm text-text-muted uppercase whitespace-nowrap">
                            {formatTimestamp(entry.createdAt)}
                          </td>
                          <td class="py-md pr-md font-body-md text-body-md text-primary whitespace-nowrap">{entry.username}</td>
                          <td class="py-md pr-md font-label-sm text-label-sm text-primary uppercase whitespace-nowrap">{entry.action}</td>
                          <td class="py-md pr-md font-label-sm text-label-sm uppercase whitespace-nowrap">
                            <span class={entry.outcome === "success" ? "text-secondary" : "text-error"}>
                              [{entry.outcome}]
                            </span>
                          </td>
                          <td class="py-md font-label-sm text-label-sm text-text-muted break-words">
                            {entry.target || entry.ip || "—"}
                          </td>
                        </tr>
                      )}
                    </For>
                  </Show>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div class="flex items-center justify-between gap-xs mt-lg">
              <button
                disabled={page() <= 1}
                onClick={() => setPage(page() - 1)}
                class="border border-hairline-strong px-md py-sm font-label-sm text-label-sm text-text-muted uppercase tracking-[2px] rounded-full hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:hover:border-hairline-strong disabled:hover:text-text-muted disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span class="font-label-sm text-label-sm text-text-muted uppercase tracking-[2px]">
                Page {page()} / {pages()}
              </span>
              <button
                disabled={page() >= pages()}
                onClick={() => setPage(page() + 1)}
                class="border border-hairline-strong px-md py-sm font-label-sm text-label-sm text-text-muted uppercase tracking-[2px] rounded-full hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:hover:border-hairline-strong disabled:hover:text-text-muted disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </Show>
        </Show>
      </section>
    </div>
  );
};

export default AdminDashboard;
