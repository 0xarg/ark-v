"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  HardDrive,
  Zap,
  CalendarDays,
  TrendingUp,
} from "lucide-react";

import {
  AppPageLoader,
  AppShellHeader,
  AppSidebar,
  MobileNavChips,
  SubscriptionSidebarCard,
} from "@/components/layout";
import { apiGet, apiGetRaw } from "@/lib/http/request";
import { navItemsForRole } from "@/lib/navigation/app-nav";
import { createClient } from "@/lib/supabase/client";
import { useTeamSidebarSubscription } from "@/hooks/use-team-sidebar-subscription";
import { PLAN_CONFIG, DEFAULT_PLAN_TYPE, type PlanType } from "@/lib/config/plans";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function pct(used: number, max: number | null): number {
  if (!max || max <= 0) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}

function barColor(p: number): string {
  if (p >= 90) return "bg-ark-red-500";
  if (p >= 70) return "bg-[#FABA17]";
  return "bg-[#10CB29]";
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  used,
  max,
  unit,
  icon,
  iconBg,
  iconColor,
  sub,
}: {
  label: string;
  used: number;
  max: number | null;
  unit?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  sub?: string;
}) {
  const p = pct(used, max);
  const unlimited = max === null;

  return (
    <article className="rounded-2xl border border-[#E0E0E0] bg-white p-5 dark:border-[#2A3444] dark:bg-[#141C27]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#919191] dark:text-[#9FA3A9]">
            {label}
          </p>
          <p className="mt-2 font-display text-[28px] leading-none text-[#1E1E1E] dark:text-white">
            {used.toLocaleString()}
            {!unlimited && max !== null ? (
              <span className="text-[16px] font-normal text-[#919191]">
                {" / "}{max.toLocaleString()}
              </span>
            ) : (
              <span className="text-[16px] font-normal text-ark-red-500"> ∞</span>
            )}
            {unit ? <span className="ml-1 text-[14px] font-normal text-[#919191]">{unit}</span> : null}
          </p>
          {sub ? <p className="mt-1.5 text-[13px] text-[#919191] dark:text-[#BFC1C5]">{sub}</p> : null}
        </div>
        <div className={cn("grid size-[52px] shrink-0 place-items-center rounded-xl border", iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>

      {!unlimited && max !== null ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="text-[#919191]">{p}% used</span>
            <span className="text-[#919191]">{Math.max(0, max - used).toLocaleString()} remaining</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#F0F0F0] dark:bg-[#2A3444]">
            <div
              className={cn("h-full rounded-full transition-all duration-500", barColor(p))}
              style={{ width: `${p}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-[13px] text-[#919191] dark:text-[#BFC1C5]">Unlimited on your plan</p>
        </div>
      )}
    </article>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function UsagePage() {
  const supabase = React.useMemo(() => createClient(), []);
  const router = useRouter();

  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [appRole, setAppRole] = React.useState<"client" | "team" | "admin" | null>(null);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const [usage, setUsage] = React.useState<{
    period: { start: string; end: string };
    request_count: number;
    active_concurrency: number;
    limits: { max_active_requests: number; max_requests_per_period: number | null; max_seats: number };
  } | null>(null);
  const [seats, setSeats] = React.useState<{ seat_count: number; max_seats: number } | null>(null);
  const [storage, setStorage] = React.useState<{
    storage_used_gb: number;
    storage_max_gb: number;
  } | null>(null);
  const [planType, setPlanType] = React.useState<PlanType>(DEFAULT_PLAN_TYPE);
  const [dataReady, setDataReady] = React.useState(false);

  const navItems = React.useMemo(() => navItemsForRole(appRole), [appRole]);
  const showSubmitTask = appRole === "client";
  const sidebarSub = useTeamSidebarSubscription(supabase, user?.id);

  React.useEffect(() => {
    void (async () => {
      try {
        const { data: meData, error } = await supabase.auth.getUser();
        if (error || !meData.user) { router.push("/auth"); return; }
        setUser(meData.user);
        try {
          const me = await apiGet<{ app_role?: "client" | "team" | "admin" }>("/api/me");
          setAppRole(me.app_role ?? "client");
        } catch { setAppRole("client"); }
      } finally { setLoading(false); }
    })();
  }, [supabase, router]);

  React.useEffect(() => {
    if (!user) return;
    void apiGetRaw<{ unread_count?: number }>("/api/notifications?limit=1")
      .then((p) => { if (typeof p.unread_count === "number") setUnreadCount(p.unread_count); })
      .catch(() => {});
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const { data: memberRow } = await supabase
          .from("team_members").select("team_id").eq("user_id", user.id).limit(1).maybeSingle();
        const tid = memberRow?.team_id as string | null;
        if (!tid) return;

        const [usageData, seatsData] = await Promise.all([
          apiGet<typeof usage>(`/api/teams/${tid}/usage`).catch(() => null),
          apiGet<{ seat_count: number; max_seats: number }>(`/api/teams/${tid}`).catch(() => null),
        ]);
        setUsage(usageData);
        setSeats(seatsData ? { seat_count: seatsData.seat_count, max_seats: seatsData.max_seats } : null);

        try {
          const s = await apiGet<{ storage_used_gb: number; storage_max_gb: number }>(`/api/teams/${tid}/storage-usage`);
          setStorage(s);
        } catch {}

        try {
          const { data: sub } = await supabase.from("subscriptions").select("plan_type").eq("team_id", tid).maybeSingle();
          if (sub?.plan_type) setPlanType(sub.plan_type as PlanType);
        } catch {}
      } finally { setDataReady(true); }
    })();
  }, [user, supabase]);

  if (loading || sidebarSub.loading || !dataReady) return <AppPageLoader variant="shell" />;

  const planCfg = PLAN_CONFIG[planType];
  const requestsUsed = usage?.request_count ?? 0;
  const requestsMax = usage?.limits.max_requests_per_period ?? null;
  const activeNow = usage?.active_concurrency ?? 0;
  const activeMax = usage?.limits.max_active_requests ?? planCfg.max_active_requests;
  const seatsUsed = seats?.seat_count ?? 0;
  const seatsMax = seats?.max_seats ?? planCfg.max_seats;
  const storageUsed = storage?.storage_used_gb ?? 0;
  const storageMax = storage?.storage_max_gb ?? planCfg.max_storage_gb;
  const periodEnd = usage?.period.end ?? null;
  const periodStart = usage?.period.start ?? null;
  const daysLeft = daysUntil(periodEnd ? `${periodEnd}T00:00:00Z` : null);

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
          onLogout={async () => { await supabase.auth.signOut(); router.push("/"); router.refresh(); }}
        />

        <main className="w-full min-w-0 max-w-full flex-1 space-y-3 sm:space-y-4">
          <MobileNavChips
            items={navItems}
            onLogout={async () => { await supabase.auth.signOut(); router.push("/"); router.refresh(); }}
          />
          <AppShellHeader
            title="Usage"
            search={null}
            showSubmitTask={showSubmitTask}
            onSubmitTask={() => router.push("/submit-request")}
            unreadCount={unreadCount}
            userEmail={user?.email ?? "user"}
          />

          {/* Period banner */}
          <div className="flex flex-col gap-2 rounded-2xl border border-[#E0E0E0] bg-white px-5 py-4 dark:border-[#2A3444] dark:bg-[#141C27] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl border border-[#E6E6E6] bg-[#F9F9F9] dark:border-[#2F3744] dark:bg-[#1A1E25]">
                <CalendarDays className="size-4 text-[#555] dark:text-[#BFC1C5]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#1E1E1E] dark:text-[#EAEBEC]">
                  Current billing period
                </p>
                <p className="text-[12px] text-[#919191] dark:text-[#BFC1C5]">
                  {formatDate(periodStart ? `${periodStart}T00:00:00Z` : null)} — {formatDate(periodEnd ? `${periodEnd}T00:00:00Z` : null)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="grid size-9 place-items-center rounded-xl border border-[#E6E6E6] bg-[#F9F9F9] dark:border-[#2F3744] dark:bg-[#1A1E25]">
                <TrendingUp className="size-4 text-[#555] dark:text-[#BFC1C5]" />
              </div>
              <div className="text-right sm:text-left">
                <p className="text-[13px] font-medium text-[#1E1E1E] dark:text-[#EAEBEC]">
                  {planCfg.display_name} plan
                </p>
                {daysLeft !== null ? (
                  <p className={cn(
                    "text-[12px]",
                    daysLeft <= 5 ? "font-medium text-ark-red-500" : "text-[#919191] dark:text-[#BFC1C5]",
                  )}>
                    Resets in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Monthly Requests"
              used={requestsUsed}
              max={requestsMax}
              icon={<LayoutDashboard className="size-5" />}
              iconBg="border-[#FF0000] bg-[rgba(255,0,0,0.04)]"
              iconColor="text-[#FF0000]"
              sub={requestsMax === null ? "Unlimited on your plan" : `${Math.max(0, requestsMax - requestsUsed)} remaining this period`}
            />
            <StatCard
              label="Active Requests"
              used={activeNow}
              max={activeMax}
              icon={<Zap className="size-5" />}
              iconBg="border-[#FABA17] bg-[rgba(250,186,23,0.06)]"
              iconColor="text-[#FABA17]"
              sub="Running simultaneously right now"
            />
            <StatCard
              label="Team Seats"
              used={seatsUsed}
              max={seatsMax}
              icon={<Users className="size-5" />}
              iconBg="border-[#9B59B6] bg-[rgba(155,89,182,0.06)]"
              iconColor="text-[#9B59B6]"
              sub={`${Math.max(0, seatsMax - seatsUsed)} seat${seatsMax - seatsUsed !== 1 ? "s" : ""} available`}
            />
            <StatCard
              label="Storage"
              used={Math.round(storageUsed * 10) / 10}
              max={storageMax}
              unit="GB"
              icon={<HardDrive className="size-5" />}
              iconBg="border-[#2F74FF] bg-[rgba(47,116,255,0.06)]"
              iconColor="text-[#2F74FF]"
              sub={`of ${planCfg.storage_label} included`}
            />
          </div>

          {/* Breakdown table */}
          <section className="rounded-2xl border border-[#E0E0E0] bg-white px-5 py-5 dark:border-[#2A3444] dark:bg-[#141C27]">
            <h2 className="font-display text-[20px] text-[#1E1E1E] dark:text-white">Plan Limits</h2>
            <p className="mt-0.5 text-[13px] text-[#919191] dark:text-[#BFC1C5]">
              Your current allocations on the {planCfg.display_name} plan.
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border border-[#EBEBEB] dark:border-[#2F3744]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#2F3744] text-white dark:bg-[#2B323E]">
                    <th className="px-4 py-2.5 text-left font-medium">Resource</th>
                    <th className="px-4 py-2.5 text-left font-medium">Used</th>
                    <th className="px-4 py-2.5 text-left font-medium">Limit</th>
                    <th className="hidden px-4 py-2.5 text-left font-medium sm:table-cell">Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0] dark:divide-[#2A3444]">
                  {[
                    {
                      label: "Monthly Requests",
                      used: requestsUsed,
                      max: requestsMax,
                      display: requestsMax === null ? "Unlimited" : String(requestsMax),
                    },
                    { label: "Active Requests", used: activeNow, max: activeMax, display: String(activeMax) },
                    { label: "Team Seats", used: seatsUsed, max: seatsMax, display: String(seatsMax) },
                    {
                      label: "Storage",
                      used: Math.round(storageUsed * 10) / 10,
                      max: storageMax,
                      display: planCfg.storage_label,
                    },
                  ].map((row) => {
                    const p = pct(row.used, row.max);
                    return (
                      <tr key={row.label} className="bg-white dark:bg-[#141C27]">
                        <td className="px-4 py-3 font-medium text-[#1E1E1E] dark:text-[#EAEBEC]">{row.label}</td>
                        <td className="px-4 py-3 text-[#555] dark:text-[#BFC1C5]">{row.used}</td>
                        <td className="px-4 py-3 text-[#555] dark:text-[#BFC1C5]">{row.display}</td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          {row.max !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#F0F0F0] dark:bg-[#2A3444]">
                                <div
                                  className={cn("h-full rounded-full", barColor(p))}
                                  style={{ width: `${p}%` }}
                                />
                              </div>
                              <span className="text-[12px] text-[#919191]">{p}%</span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-ark-red-500">∞ Unlimited</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/subscription")}
                className="rounded-full bg-[#2F3744] px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#2F3744]/90 dark:bg-[#2B323E]"
              >
                View Billing
              </button>
              <button
                type="button"
                onClick={() => router.push("/team")}
                className="rounded-full border border-[#E6E6E6] px-5 py-2 text-[13px] font-medium text-[#555] transition-colors hover:bg-[#F5F5F5] dark:border-[#2F3744] dark:text-[#BFC1C5] dark:hover:bg-[#1A1E25]"
              >
                Manage Team
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
