"use client"

import type { User } from "@supabase/supabase-js"
import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  AppPageLoader,
  AppShellHeader,
  AppSidebar,
  MobileNavChips,
  SubscriptionSidebarCard,
  TablePagination,
} from "@/components/layout"
import { Button } from "@/components/ui/button"
import { apiGet, apiGetRaw } from "@/lib/http/request"
import { navItemsForRole } from "@/lib/navigation/app-nav"
import {
  DEFAULT_PLAN_TYPE,
  PLAN_CONFIG,
  PLAN_TYPES,
  PRIMARY_PLAN_KEYS,
  formatPlanPrice,
  requestLimitLabel as getPlanRequestLabel,
  type PlanType,
} from "@/lib/config/plans"
import { ChevronLeft, LayoutDashboard, Users, HardDrive, ExternalLink } from "lucide-react"

function getBillingPortalUrl(): string | null {
  const v = process.env.NEXT_PUBLIC_BILLING_PORTAL_URL
  return v && v.trim().length > 0 ? v.trim() : null
}

type RequestLimits = {
  max_active_requests: number
  max_requests_per_period: number | null
  max_seats: number
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function formatGb(value: number): string {
  if (!Number.isFinite(value)) return "0"
  // Use integer GB in UI (matches current Figma style).
  return String(Math.round(value))
}

function inferPlanTypeFromLimits(limits: RequestLimits): PlanType {
  const entries = Object.entries(PLAN_CONFIG) as Array<[PlanType, typeof PLAN_CONFIG[PlanType]]>
  const match = entries.find(
    ([, cfg]) =>
      cfg.max_active_requests === limits.max_active_requests &&
      cfg.max_seats === limits.max_seats &&
      cfg.max_requests_per_period === limits.max_requests_per_period
  )
  return match?.[0] ?? DEFAULT_PLAN_TYPE
}

function getPlanDisplay(planType: PlanType): { label: string; price_monthly_usd: number } {
  const cfg = PLAN_CONFIG[planType]
  return { label: cfg.display_name, price_monthly_usd: cfg.price_monthly_usd }
}

const BILLING_PAGE_SIZE = 5

export default function SubscriptionPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const router = useRouter()
  const billingPortalUrl = React.useMemo(() => getBillingPortalUrl(), [])

  const openBillingPortal = React.useCallback(() => {
    if (billingPortalUrl) {
      window.location.assign(billingPortalUrl)
    }
  }, [billingPortalUrl])

  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [pageDataReady, setPageDataReady] = React.useState(false)
  const [appRole, setAppRole] = React.useState<"client" | "team" | "admin" | null>(null)

  const [unreadNotificationCount, setUnreadNotificationCount] = React.useState(0)
  const [usage, setUsage] = React.useState<{
    period: { start: string; end: string }
    active_concurrency: number
    limits: { max_active_requests: number; max_requests_per_period: number | null; max_seats: number }
    max_active_concurrency: number
  } | null>(null)

  const [seats, setSeats] = React.useState<{ seat_count: number; max_seats: number } | null>(null)
  const [storage, setStorage] = React.useState<{
    period: { start: string; end: string }
    storage_used_gb: number
    storage_max_gb: number
  } | null>(null)

  const [subscription, setSubscription] = React.useState<{
    id: string
    plan_type: PlanType
    current_period_end: string | null
  } | null>(null)

  const navItems = React.useMemo(() => navItemsForRole(appRole), [appRole])
  const showSubmitTask = appRole === "client"

  const billingRowCount = subscription ? 1 : 0
  const billingTotalPages = Math.max(1, Math.ceil(billingRowCount / BILLING_PAGE_SIZE))
  const [billingPage, setBillingPage] = React.useState(1)

  React.useEffect(() => {
    setBillingPage(1)
  }, [billingRowCount])

  React.useEffect(() => {
    if (billingPage > billingTotalPages) setBillingPage(billingTotalPages)
  }, [billingPage, billingTotalPages])

  const loadTeamId = React.useCallback(async () => {
    if (!user) throw new Error("User not loaded")
    const { data, error } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data?.team_id) throw new Error("No team membership found for your account")
    return data.team_id as string
  }, [supabase, user])

  React.useEffect(() => {
    void (async () => {
      try {
        const { data: meData, error: meError } = await supabase.auth.getUser()
        if (meError || !meData.user) {
          router.push("/auth")
          return
        }
        setUser(meData.user)

        try {
          const me = await apiGet<{ app_role?: "client" | "team" | "admin" }>("/api/me")
          setAppRole(me.app_role ?? "client")
        } catch {
          setAppRole("client")
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [supabase, router])

  React.useEffect(() => {
    if (!user) return
    void (async () => {
      try {
        const payload = await apiGetRaw<{ unread_count?: number }>(
          "/api/notifications?limit=1"
        )
        if (typeof payload.unread_count === "number") {
          setUnreadNotificationCount(payload.unread_count)
        }
      } catch {
        /* ignore badge failures */
      }
    })()
  }, [user])

  React.useEffect(() => {
    if (!user) return
    void (async () => {
      setPageDataReady(false)
      try {
        const tid = await loadTeamId()

        const [usageData, seatsData] = await Promise.all([
          apiGet<{
            period: { start: string; end: string }
            request_count: number
            active_concurrency: number
            max_active_concurrency: number
            limits: { max_active_requests: number; max_requests_per_period: number | null; max_seats: number }
          }>(`/api/teams/${tid}/usage`),
          apiGet<{ seat_count: number; max_seats: number }>(`/api/teams/${tid}`),
        ])

        setUsage(usageData ?? null)
        setSeats(
          seatsData
            ? { seat_count: seatsData.seat_count, max_seats: seatsData.max_seats }
            : null
        )

        try {
          const storageData = await apiGet<{
            period: { start: string; end: string }
            storage_used_gb: number
            storage_max_gb: number
          }>(`/api/teams/${tid}/storage-usage`)
          setStorage(storageData ?? null)
        } catch {
          /* ignore */
        }

        // Subscription row for plan name + current period end.
        try {
          const { data: subRow, error: subErr } = await supabase
            .from("subscriptions")
            .select("id, plan_type, current_period_end")
            .eq("team_id", tid)
            .maybeSingle()
          if (!subErr && subRow?.plan_type && PLAN_TYPES.includes(subRow.plan_type as PlanType)) {
            setSubscription({
              id: subRow.id,
              plan_type: subRow.plan_type as PlanType,
              current_period_end: subRow.current_period_end ?? null,
            })
          }
        } catch {
          /* ignore; we can still infer plan from limits */
        }
      } catch {
        // Keep the page renderable even if some widgets fail.
      } finally {
        setPageDataReady(true)
      }
    })()
  }, [user, loadTeamId, supabase])

  const resolvedPlanType = React.useMemo(() => {
    if (subscription?.plan_type) return subscription.plan_type
    if (usage?.limits) return inferPlanTypeFromLimits({ ...usage.limits })
    return DEFAULT_PLAN_TYPE
  }, [subscription, usage])

  const plan = React.useMemo(() => getPlanDisplay(resolvedPlanType), [resolvedPlanType])

  const nextRenewal = subscription?.current_period_end
    ? subscription.current_period_end
    : usage?.period.end
      ? `${usage.period.end}T00:00:00.000Z`
      : null

  const activeTasks = usage?.active_concurrency ?? 0
  const maxActiveTasks = usage?.limits.max_active_requests ?? PLAN_CONFIG[resolvedPlanType].max_active_requests
  const seatCount = seats?.seat_count ?? 0
  const maxSeats = seats?.max_seats ?? PLAN_CONFIG[resolvedPlanType].max_seats
  const storageUsedGb = storage?.storage_used_gb ?? 0
  const storageMaxGb = storage?.storage_max_gb ?? PLAN_CONFIG[resolvedPlanType].max_storage_gb
  const requestLimitLabel =
    usage?.limits.max_requests_per_period == null
      ? "Unlimited queue"
      : `${usage.limits.max_requests_per_period} requests / month`

  if (loading || !pageDataReady) {
    return <AppPageLoader variant="shell" />
  }

  return (
    <div className="min-h-screen bg-background p-3 text-foreground sm:p-4 lg:p-[18px]">
      <div className="mx-auto flex w-full max-w-[min(100%,2200px)] gap-3 sm:gap-4 xl:gap-[18px]">
        <AppSidebar
          items={navItems}
          subscriptionCard={
            <SubscriptionSidebarCard
              planLabel={plan.label}
              activeConcurrency={activeTasks}
              maxActiveRequests={maxActiveTasks}
              onUpgrade={() => openBillingPortal()}
            />
          }
          onLogout={async () => {
            await supabase.auth.signOut()
            router.push("/")
            router.refresh()
          }}
        />

        <main className="w-full min-w-0 max-w-full flex-1 space-y-3 sm:space-y-4">
          <MobileNavChips
            items={navItems}
            onLogout={async () => {
              await supabase.auth.signOut()
              router.push("/")
              router.refresh()
            }}
          />

          <AppShellHeader
            title="Billing & Subscription"
            leadingSlot={
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border border-[#E6E6E6] bg-[#F6F6F6] transition-colors hover:bg-[#ECECEC] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:hover:bg-[#2F3744]"
                aria-label="Back to dashboard"
              >
                <ChevronLeft className="size-4 text-[#4A4A4A] dark:text-[#EAEBEC]" />
              </button>
            }
            search={null}
            toolbarExtras={
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-[42px] cursor-pointer rounded-full border-ark-red-500 px-[18px] text-ark-red-500 shadow-[0px_8px_14px_0px_rgba(255,0,0,0.1)]"
                onClick={openBillingPortal}
                disabled={!billingPortalUrl}
              >
                {billingPortalUrl ? (
                  <span className="flex items-center gap-1.5">
                    Manage Billing <ExternalLink className="size-3.5" />
                  </span>
                ) : (
                  "Billing Portal Not Configured"
                )}
              </Button>
            }
            showSubmitTask={showSubmitTask}
            onSubmitTask={() => router.push("/submit-request")}
            unreadCount={unreadNotificationCount}
            userEmail={user?.email ?? "user"}
          />

          {/* Usage summary strip — links to the dedicated /usage page */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E0E0E0] bg-white px-5 py-4 dark:border-[#2A3444] dark:bg-[#141C27]">
            <p className="text-[14px] text-[#919191] dark:text-[#BFC1C5]">
              Request usage, storage, and team seats are tracked on the Usage page.
            </p>
            <button
              type="button"
              onClick={() => router.push("/usage")}
              className="flex items-center gap-1.5 rounded-full bg-[#F6F6F6] px-4 py-2 text-[13px] font-medium text-[#1E1E1E] transition-colors hover:bg-[#ECECEC] dark:bg-[#1A1E25] dark:text-[#EAEBEC] dark:hover:bg-[#2F3744]"
            >
              View Usage →
            </button>
          </div>

          <section className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
            <article className="rounded-2xl border border-[#E0E0E0] bg-white px-4 py-5 dark:border-[#2A3444] dark:bg-[#141C27] sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-[20px] leading-none text-[#1E1E1E] dark:text-white">Current Plan</h2>
                </div>
                <span className="rounded-full border border-[#2F3744] bg-[rgba(16,203,41,0.1)] px-2 py-0.5 text-[14px] text-[#10CB29]">
                  Active
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-[14px] text-[#919191]">Subscription</p>
                  <p className="mt-1 text-[24px] font-medium leading-6 text-ark-red-500">{plan.label}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[14px] text-[#919191]">Billing Cycle:</p>
                  <p className="text-[20px] leading-[24px] text-black dark:text-[#EAEBEC]">Monthly</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[14px] text-[#919191]">Price:</p>
                  <p className="text-[20px] leading-[24px] text-black dark:text-[#EAEBEC]">{formatPlanPrice(plan.price_monthly_usd)} / month</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[14px] text-[#919191]">Request Limit:</p>
                  <p className="text-[20px] leading-[24px] text-black dark:text-[#EAEBEC]">{requestLimitLabel}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[14px] text-[#919191]">Active Requests at a Time:</p>
                  <p className="text-[20px] leading-[24px] text-black dark:text-[#EAEBEC]">{maxActiveTasks}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[14px] text-[#919191]">Next Renewal:</p>
                  <p className="text-[20px] leading-[24px] text-black dark:text-[#EAEBEC]">{formatDate(nextRenewal)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[14px] text-[#919191]">Payment Method:</p>
                  <p className="text-[20px] leading-[24px] text-black dark:text-[#EAEBEC]">—</p>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  className="w-full cursor-pointer rounded-full bg-[#FFE4E4] px-5 py-[12px] text-[14px] font-medium text-[#2F3744] transition-colors hover:bg-[#FFD4D4]"
                  onClick={() => openBillingPortal()}
                >
                  Manage Subscription
                </button>
                <p className="mt-2 text-center text-[12px] text-[#919191]">Cancel anytime.</p>
              </div>
            </article>

            <article className="rounded-2xl border border-[#E0E0E0] bg-white px-4 py-5 dark:border-[#2A3444] dark:bg-[#141C27] sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-[20px] leading-none text-[#1E1E1E] dark:text-white">Billing History</h2>
                </div>
                <span className="rounded-full border border-[#2F3744] bg-[rgba(16,203,41,0.1)] px-2 py-0.5 text-[14px] text-[#10CB29]">
                  Active
                </span>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-[#ECECEC] dark:border-[#2F3744]">
                <div className="grid grid-cols-12 bg-[#2F3744] px-4 py-3 text-[12px] font-medium text-white dark:bg-[#2B323E]">
                  <div className="col-span-3">Invoice ID</div>
                  <div className="col-span-3">Date</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>

                <div>
                  {subscription ? (
                    <div className="grid grid-cols-12 items-center px-4 py-3 text-[14px]">
                      <div className="col-span-3 truncate text-[#1E1E1E] font-medium dark:text-[#EAEBEC]">
                        {`INV-${subscription.id.slice(0, 8).toUpperCase()}`}
                      </div>
                      <div className="col-span-3 truncate text-[#1E1E1E] dark:text-[#EAEBEC]">
                        {formatDate(subscription.current_period_end ?? usage?.period.end)}
                      </div>
                      <div className="col-span-2 truncate text-[#1E1E1E] dark:text-[#EAEBEC]">{formatPlanPrice(plan.price_monthly_usd)}</div>
                      <div className="col-span-2 truncate">
                        <span className="inline-flex rounded-full bg-[#DFFFEA] px-3 py-1 text-[12px] font-medium text-[#10CB29]">
                          Paid
                        </span>
                      </div>
                      <div className="col-span-2 truncate text-right">
                        <button
                          className="inline-flex h-[32px] items-center justify-center rounded-full bg-[#2F3744] px-4 text-[12px] font-medium text-white"
                          onClick={() => {
                            openBillingPortal()
                          }}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-10 text-center text-[14px] text-[#919191]">
                      No invoices yet.
                    </div>
                  )}
                </div>
              </div>

              <TablePagination
                className="mt-5"
                page={billingPage}
                totalPages={billingTotalPages}
                onPageChange={setBillingPage}
              />
            </article>
          </section>

          {/* Plan comparison */}
          <section className="rounded-2xl border border-[#E0E0E0] bg-white px-4 py-5 dark:border-[#2A3444] dark:bg-[#141C27] sm:px-5">
            <h2 className="font-display text-[20px] text-[#1E1E1E] dark:text-white">All Plans</h2>
            <p className="mt-1 text-[13px] text-[#919191] dark:text-[#BFC1C5]">
              Compare plans and upgrade anytime.
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {PRIMARY_PLAN_KEYS.map((key) => {
                const cfg = PLAN_CONFIG[key]
                const isCurrent = cfg.display_name === plan.label
                return (
                  <article
                    key={key}
                    className={[
                      "rounded-xl border p-4",
                      isCurrent
                        ? "border-ark-red-500 bg-[rgba(255,0,0,0.03)] dark:bg-[rgba(255,0,0,0.05)]"
                        : "border-[#EBEBEB] bg-[#FAFAFA] dark:border-[#2F3744] dark:bg-[#1A1E25]",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[16px] font-semibold text-[#1E1E1E] dark:text-white">
                        {cfg.display_name}
                      </p>
                      {isCurrent ? (
                        <span className="shrink-0 rounded-full bg-[rgba(16,203,41,0.12)] px-2 py-0.5 text-[11px] font-medium text-[#10CB29]">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[18px] font-medium text-ark-red-500">
                      {formatPlanPrice(cfg.price_monthly_usd)}
                      <span className="text-[13px] font-normal text-[#919191]"> / mo</span>
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      <li className="text-[12px] text-[#616161] dark:text-[#BFC1C5]">
                        {getPlanRequestLabel(cfg)}
                      </li>
                      <li className="text-[12px] text-[#616161] dark:text-[#BFC1C5]">
                        {cfg.max_active_requests} active request{cfg.max_active_requests !== 1 ? "s" : ""} at a time
                      </li>
                      <li className="text-[12px] text-[#616161] dark:text-[#BFC1C5]">
                        {cfg.max_seats} team seat{cfg.max_seats !== 1 ? "s" : ""}
                      </li>
                      <li className="text-[12px] text-[#616161] dark:text-[#BFC1C5]">
                        {cfg.storage_label} storage
                      </li>
                    </ul>
                    {!isCurrent && billingPortalUrl ? (
                      <button
                        type="button"
                        onClick={openBillingPortal}
                        className="mt-4 w-full cursor-pointer rounded-full border border-ark-red-500 py-1.5 text-[13px] font-medium text-ark-red-500 transition-colors hover:bg-[rgba(255,0,0,0.04)]"
                      >
                        Upgrade
                      </button>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
