"use client";

/* eslint-disable @next/next/no-img-element -- Dicebear avatars use external SVG URLs (same pattern as dashboard). */

import type { ActivityFeedEntry } from "@/lib/api/activity-feed";
import type { ActivityActionType } from "@/lib/api/activity";
import { ACTIVITY_ACTIONS } from "@/lib/api/activity";
import {
  AppPageLoader,
  AppShellHeader,
  AppSidebar,
  MobileNavChips,
  SubscriptionSidebarCard,
} from "@/components/layout";
import { RequestMessagesTab } from "@/components/requests/request-messages-tab";
import { apiGet, apiGetRaw } from "@/lib/http/request";
import { createClient } from "@/lib/supabase/client";
import { useTeamSidebarSubscription } from "@/hooks/use-team-sidebar-subscription";
import { navItemsForRole } from "@/lib/navigation/app-nav";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  BarChart3,
  Bookmark,
  ChevronDown,
  Search,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

type AppRole = "client" | "team" | "admin";

const FILTER_OPTIONS: Array<{
  value: "all" | ActivityActionType;
  label: string;
}> = [
  { value: "all", label: "All" },
  ...ACTIVITY_ACTIONS.map((a) => ({
    value: a,
    label: a.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  })),
];

function formatFeedTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (isToday) return `Today at ${time}`;
  const date = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${date} • ${time}`;
}

function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(seed)}`;
}

export default function RequestActivityPage() {
  const params = useParams();
  const requestId = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [requestTitle, setRequestTitle] = React.useState("");
  const [entries, setEntries] = React.useState<ActivityFeedEntry[]>([]);
  const [feedLoading, setFeedLoading] = React.useState(true);
  const [feedError, setFeedError] = React.useState<string | null>(null);
  const [mainTab, setMainTab] = React.useState<"activity" | "request-manager">(
    "request-manager",
  );
  const [filter, setFilter] = React.useState<"all" | ActivityActionType>("all");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [headerSearch, setHeaderSearch] = React.useState("");
  const [unreadNotificationCount, setUnreadNotificationCount] =
    React.useState(0);
  const [appRole, setAppRole] = React.useState<AppRole | null>(null);

  const navItems = React.useMemo(() => navItemsForRole(appRole), [appRole]);
  const showSubmitTask = appRole === "client";
  const sidebarSub = useTeamSidebarSubscription(supabase, user?.id);

  React.useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.push("/auth");
        return;
      }
      setUser(data.user);
      try {
        const me = await apiGet<{ app_role?: AppRole }>("/api/me");
        setAppRole(me.app_role ?? "client");
      } catch {
        setAppRole("client");
      }
      setLoading(false);
    })();
  }, [router, supabase]);

  const loadActivity = React.useCallback(async () => {
    if (!user || !requestId) return;
    setFeedLoading(true);
    setFeedError(null);
    try {
      const data = await apiGet<{
        request: { title: string };
        entries: ActivityFeedEntry[];
      }>(`/api/requests/${requestId}/activity`);
      setRequestTitle(data?.request.title ?? "");
      setEntries(data?.entries ?? []);
    } catch (e) {
      setFeedError(e instanceof Error ? e.message : "Failed to load activity");
    } finally {
      setFeedLoading(false);
    }
  }, [user, requestId]);

  React.useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  React.useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const payload = await apiGetRaw<{ unread_count?: number }>(
          "/api/notifications?limit=1",
        );
        if (typeof payload.unread_count === "number") {
          setUnreadNotificationCount(payload.unread_count);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [user]);

  const filteredEntries = React.useMemo(() => {
    let list = entries;
    if (filter !== "all") {
      list = list.filter((e) => e.actionType === filter);
    }
    if (headerSearch.trim().length > 0) {
      const hq = headerSearch.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.primaryText.toLowerCase().includes(hq) ||
          (e.secondaryText?.toLowerCase().includes(hq) ?? false) ||
          e.displayName.toLowerCase().includes(hq) ||
          (e.categoryHeader?.toLowerCase().includes(hq) ?? false),
      );
    }
    return list;
  }, [entries, filter, headerSearch]);

  const filterLabel =
    FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? "All";

  if (
    loading ||
    sidebarSub.loading ||
    (feedLoading && entries.length === 0 && !feedError)
  ) {
    return <AppPageLoader variant="shell" />;
  }

  return (
    <div className="min-h-screen bg-background p-3 text-foreground sm:p-4 lg:p-[18px]">
      <div className="mx-auto flex w-full max-w-[min(100%,2200px)] gap-3 sm:gap-4 xl:gap-[18px]">
        <AppSidebar
          items={navItems}
          subscriptionCard={
            <SubscriptionSidebarCard
              planLabel={sidebarSub.planLabel}
              activeConcurrency={sidebarSub.activeConcurrency}
              maxActiveRequests={sidebarSub.maxActiveRequests}
              loading={sidebarSub.loading}
              onUpgrade={() => router.push("/subscription")}
            />
          }
          onLogout={async () => {
            await supabase.auth.signOut();
            router.push("/");
            router.refresh();
          }}
        />

        <main className="w-full min-w-0 max-w-full flex-1 space-y-3 sm:space-y-4">
          <MobileNavChips
            items={navItems}
            onLogout={async () => {
              await supabase.auth.signOut();
              router.push("/");
              router.refresh();
            }}
          />

          <AppShellHeader
            title={requestTitle || "Request"}
            leadingSlot={
              <button
                type="button"
                onClick={() => router.back()}
                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border border-[#E6E6E6] bg-[#F6F6F6] transition-colors hover:bg-[#ECECEC] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:hover:bg-[#2F3744]"
                aria-label="Back"
              >
                <ArrowLeft className="size-5 text-ark-black dark:text-[#EAEBEC]" />
              </button>
            }
            search={{
              id: "activity-header-search",
              value: headerSearch,
              onChange: setHeaderSearch,
              placeholder: "Search activity…",
            }}
            showSubmitTask={showSubmitTask}
            onSubmitTask={() => router.push("/submit-request")}
            unreadCount={unreadNotificationCount}
            userEmail={user?.email ?? "user"}
          />

          <div className="min-h-[800px] rounded-2xl border border-[#E0E0E0] bg-white p-3 dark:border-[#2A3444] dark:bg-[#141C27] md:p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="font-display text-2xl text-[#1E1E1E] dark:text-white">
                {mainTab === "request-manager" ? "Request Manager" : "Activity"}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex h-[42px] rounded-full border border-[#DDD] bg-[#f6f6f6] p-1 dark:border-[#2F3744] dark:bg-[#1A1E25]">
                  <button
                    type="button"
                    className={cn(
                      "h-full cursor-pointer rounded-full px-6 text-[14px] font-medium transition-colors",
                      mainTab === "activity"
                        ? "bg-ark-brand-red text-white shadow-[0px_8px_14px_0px_rgba(255,0,0,0.2)]"
                        : "bg-transparent text-black hover:bg-white/80 dark:text-[#EAEBEC] dark:hover:bg-[#2F3744]",
                    )}
                    onClick={() => setMainTab("activity")}
                  >
                    Activity
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "h-full cursor-pointer rounded-full px-6 text-[14px] font-medium transition-colors",
                      mainTab === "request-manager"
                        ? "bg-ark-brand-red text-white shadow-[0px_8px_14px_0px_rgba(255,0,0,0.2)]"
                        : "bg-transparent text-black hover:bg-white/80 dark:text-[#EAEBEC] dark:hover:bg-[#2F3744]",
                    )}
                    onClick={() => setMainTab("request-manager")}
                  >
                    Request Manager
                  </button>
                </div>
                {mainTab === "activity" ? (
                  <>
                    <button
                      type="button"
                      className="grid size-[42px] cursor-pointer place-items-center rounded-full border border-[#E6E6E6] bg-[#F6F6F6] transition-colors hover:bg-[#ECECEC] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:hover:bg-[#2F3744]"
                      aria-label="Search activity"
                      onClick={() =>
                        document
                          .getElementById("activity-header-search")
                          ?.focus()
                      }
                    >
                      <Search className="size-5" />
                    </button>
                    <div
                      className="flex h-[42px] items-center gap-2 rounded-full border border-ark-dark-blue-grey bg-white pl-3 pr-2 dark:border-[#2F3744] dark:bg-[#1A1E25]"
                      data-testid="activity-filter"
                    >
                      <BarChart3 className="size-5 shrink-0 text-[#1E1E1E] dark:text-[#EAEBEC]" />
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setFilterOpen((o) => !o)}
                          className="flex min-w-[120px] cursor-pointer items-center justify-between gap-2 text-[14px] font-medium text-black dark:text-[#EAEBEC]"
                        >
                          {filterLabel}
                          <ChevronDown className="size-4" />
                        </button>
                        {filterOpen ? (
                          <div className="absolute right-0 top-full z-20 mt-1 max-h-64 w-52 overflow-auto rounded-xl border border-[#E0E0E0] bg-white py-1 shadow-lg dark:border-[#2F3744] dark:bg-[#1A1E25]">
                            {FILTER_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className="flex w-full cursor-pointer px-3 py-2 text-left text-[13px] hover:bg-[#F6F6F6] dark:hover:bg-[#2F3744]"
                                onClick={() => {
                                  setFilter(opt.value);
                                  setFilterOpen(false);
                                }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className="grid size-[42px] cursor-pointer place-items-center rounded-full border border-[#E6E6E6] bg-[#F6F6F6] transition-colors hover:bg-[#ECECEC] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:hover:bg-[#2F3744]"
                    aria-label="Search (header)"
                    onClick={() =>
                      document.getElementById("activity-header-search")?.focus()
                    }
                  >
                    <Search className="size-5" />
                  </button>
                )}
              </div>
            </div>

            {mainTab === "request-manager" ? (
              <RequestMessagesTab
                requestId={requestId}
                activityEntries={entries}
                onRefreshActivity={() => void loadActivity()}
              />
            ) : (
              <div className="relative mt-4">
                <div className="pointer-events-none absolute left-[20px] top-10 z-[1] hidden h-[calc(100%-3rem)] border-l border-dashed border-[#C8C8C8] md:block" />
                <div className="pointer-events-none absolute left-0 right-0 top-0 z-[1] h-16 bg-gradient-to-b from-white to-transparent" />
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-20 bg-gradient-to-t from-white to-transparent" />

                <div className="relative max-h-[688px] overflow-y-auto overflow-x-hidden pr-3 [scrollbar-width:thin]">
                  {feedLoading ? (
                    <div className="rounded-xl border border-dashed border-[#E6E6E6]">
                      <AppPageLoader
                        variant="inline"
                        className="min-h-[200px] py-12"
                      />
                    </div>
                  ) : feedError ? (
                    <p className="py-12 text-center text-[14px] text-[#CE3426]">
                      {feedError}
                    </p>
                  ) : filteredEntries.length === 0 ? (
                    <p className="py-12 text-center text-[14px] text-[#666]">
                      No activity matches your filters.
                    </p>
                  ) : (
                    <ul className="relative z-[2] space-y-8 pb-8 pt-2">
                      {filteredEntries.map((entry) => (
                        <li key={entry.id} className="flex gap-4 md:gap-8">
                          <div className="relative z-[3] flex w-[42px] shrink-0 flex-col items-center md:w-[52px]">
                            {entry.showActorRow ? (
                              <img
                                src={avatarUrl(entry.actorUserId)}
                                alt=""
                                className="size-[42px] rounded-full border-2 border-white bg-[#F6F6F6] object-cover"
                              />
                            ) : (
                              <div className="size-[42px] shrink-0 rounded-full bg-[#ECECEC]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            {entry.categoryHeader ? (
                              <p className="font-sans text-[18px] font-medium text-[#1E1E1E]">
                                {entry.categoryHeader}
                              </p>
                            ) : entry.showActorRow ? (
                              <>
                                <p className="font-sans text-[18px] font-medium leading-tight text-[#1E1E1E]">
                                  {entry.displayName}
                                </p>
                                <p className="mt-0.5 text-[14px] font-medium text-[#919191]">
                                  {entry.roleLabel}
                                </p>
                              </>
                            ) : null}

                            <div
                              className={cn(
                                "relative mt-3 rounded-2xl bg-[#F6F6F6] p-4 pr-10",
                                entry.fileAttachments?.length
                                  ? "min-h-[120px]"
                                  : "min-h-[85px]",
                              )}
                            >
                              <button
                                type="button"
                                className="absolute right-3 top-3 cursor-pointer text-[#1E1E1E] opacity-70 hover:opacity-100"
                                aria-label="Bookmark"
                              >
                                <Bookmark className="size-5" />
                              </button>
                              <p className="text-[14px] font-medium text-[#919191]">
                                {formatFeedTimestamp(entry.timestamp)}
                              </p>
                              <p className="mt-2 text-[14px] font-medium text-[#3B3B3B]">
                                {entry.primaryText}
                              </p>
                              {entry.secondaryText ? (
                                <p className="mt-2 text-[14px] font-normal text-[#919191]">
                                  {entry.secondaryText}
                                </p>
                              ) : null}
                              {entry.fileAttachments?.length ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {entry.fileAttachments.map((f) => (
                                    <div
                                      key={`${entry.id}-${f.name}`}
                                      className="flex h-10 items-center gap-2 rounded-full border border-[#E6E6E6] bg-white py-1 pl-1 pr-4"
                                    >
                                      <div className="grid size-8 shrink-0 place-items-center rounded-full border border-[#E6E6E6] bg-[#F6F6F6] p-1">
                                        <span className="text-[10px] font-medium text-[#3B3B3B]">
                                          {f.name
                                            .split(".")
                                            .pop()
                                            ?.slice(0, 4) ?? "file"}
                                        </span>
                                      </div>
                                      <span className="max-w-[160px] truncate text-[14px] font-medium text-[#3B3B3B]">
                                        {f.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
