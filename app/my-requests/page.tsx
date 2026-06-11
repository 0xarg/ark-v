"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ClipboardList, Calendar, LayoutList, ArrowDownUp, SlidersHorizontal } from "lucide-react";

import { RequestCalendarGrid } from "@/components/dashboard/request-calendar-grid";
import {
  AppPageLoader,
  RequestLimitReachedModal,
  AppShellHeader,
  AppSidebar,
  HoverTip,
  MobileNavChips,
  SubscriptionSidebarCard,
  TablePagination,
  toolbarIconButtonClass,
  toolbarPillActiveClass,
  toolbarPillIdleClass,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { navItemsForRole } from "@/lib/navigation/app-nav";
import { cn } from "@/lib/utils";
import { type RequestStatus } from "@/app/dashboard/_hooks/use-dashboard-data";
import { useDashboardData } from "@/app/dashboard/_hooks/use-dashboard-data";

type SortKey = "createdDate" | "title" | "status";
type SortDirection = "asc" | "desc";

const STATUS_FILTERS: Array<"All" | RequestStatus> = [
  "All",
  "New",
  "In Progress",
  "Done",
];

const STATUS_STYLES: Record<RequestStatus, string> = {
  New: "border-[#508CF0] bg-[rgba(80,140,240,0.1)] text-[#508CF0]",
  "In Progress": "border-[#FABA17] bg-[rgba(250,186,23,0.1)] text-[#FABA17]",
  Done: "border-[#10CB29] bg-[rgba(16,203,41,0.1)] text-[#10CB29]",
};

const PAGE_SIZE = 10;

function parseDisplayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function StatusPill({ status }: { status: RequestStatus }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[64px] items-center justify-center rounded-[50px] border px-3.5 py-2 text-[14px] font-medium leading-[14px]",
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  );
}

function EmptyState({ onSubmit }: { onSubmit?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-full border border-[#ECECEC] bg-[#F9F9F9] dark:border-[#2F3744] dark:bg-[#1A1E25]">
        <ClipboardList className="size-7 text-[#B0B0B0] dark:text-[#747982]" />
      </div>
      <p className="font-display text-[20px] text-[#1E1E1E] dark:text-white">
        No requests yet
      </p>
      <p className="mt-1.5 max-w-[280px] text-[14px] text-[#919191] dark:text-[#BFC1C5]">
        Submit your first design request to get started.
      </p>
      {onSubmit ? (
        <Button
          variant="primary"
          size="sm"
          className="mt-5 h-[38px] cursor-pointer px-5 text-[14px] font-medium shadow-[0px_8px_24px_0px_rgba(255,0,0,0.12)]"
          onClick={onSubmit}
        >
          Submit Request
        </Button>
      ) : null}
    </div>
  );
}

export default function MyRequestsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const router = useRouter();
  const {
    user,
    loading,
    appRole,
    requests,
    requestsLoading,
    requestsError,
    unreadNotificationCount,
    usageAggregate,
    planLabel,
  } = useDashboardData({ supabase, router });

  const [statusFilter, setStatusFilter] = React.useState<"All" | RequestStatus>("All");
  const [showLimitReachedModal, setShowLimitReachedModal] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("createdDate");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");
  const [tableMode, setTableMode] = React.useState<"list" | "calendar">("list");

  const navItems = React.useMemo(() => navItemsForRole(appRole), [appRole]);

  const showSubmitTask = appRole === "client";

  const activeCount = React.useMemo(
    () => requests.filter((item) => item.status !== "Done").length,
    [requests],
  );
  const activeRequestsForCard = usageAggregate?.active_concurrency_sum ?? activeCount;
  const maxActiveRequestsForCard = usageAggregate?.max_active_requests_sum ?? 0;

  const isLimitReached =
    showSubmitTask &&
    maxActiveRequestsForCard > 0 &&
    activeRequestsForCard >= maxActiveRequestsForCard;

  const handleSubmitTask = React.useCallback(() => {
    if (isLimitReached) {
      setShowLimitReachedModal(true);
      return;
    }
    router.push("/submit-request");
  }, [isLimitReached, router]);

  const filteredRequests = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return requests.filter((item) => {
      const byStatus = statusFilter === "All" || item.status === statusFilter;
      const bySearch =
        needle.length === 0 ||
        item.title.toLowerCase().includes(needle) ||
        item.createdDate.toLowerCase().includes(needle) ||
        item.status.toLowerCase().includes(needle);
      return byStatus && bySearch;
    });
  }, [requests, search, statusFilter]);

  const [listPage, setListPage] = React.useState(1);

  React.useEffect(() => {
    setListPage(1);
  }, [search, statusFilter, filteredRequests.length]);

  const sortedRequests = React.useMemo(() => {
    const items = [...filteredRequests];
    items.sort((a, b) => {
      let left: string | number = "";
      let right: string | number = "";
      if (sortKey === "createdDate") {
        left = parseDisplayDate(a.createdDate);
        right = parseDisplayDate(b.createdDate);
      } else if (sortKey === "title") {
        left = a.title.toLowerCase();
        right = b.title.toLowerCase();
      } else {
        left = a.status.toLowerCase();
        right = b.status.toLowerCase();
      }
      if (left < right) return sortDirection === "asc" ? -1 : 1;
      if (left > right) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return items;
  }, [filteredRequests, sortDirection, sortKey]);

  const listTotalPages = Math.max(1, Math.ceil(sortedRequests.length / PAGE_SIZE));
  const pagedRequests = React.useMemo(() => {
    const start = (listPage - 1) * PAGE_SIZE;
    return sortedRequests.slice(start, start + PAGE_SIZE);
  }, [sortedRequests, listPage]);

  React.useEffect(() => {
    if (listPage > listTotalPages) {
      setListPage(listTotalPages);
    }
  }, [listPage, listTotalPages]);

  const handleSortCycle = React.useCallback(() => {
    if (sortKey === "createdDate") { setSortKey("title"); return; }
    if (sortKey === "title") { setSortKey("status"); return; }
    setSortKey("createdDate");
  }, [sortKey]);

  const sortFieldLabel =
    sortKey === "createdDate"
      ? "Submitted date"
      : sortKey === "title"
        ? "Title"
        : "Status";

  if (loading) {
    return <AppPageLoader variant="shell" />;
  }

  if (requestsError && requests.length === 0) {
    return (
      <AppPageLoader
        variant="shell-error"
        errorTitle="Something went wrong"
        errorMessage="We couldn't load your requests. Please try again."
        retryLabel="Retry"
        onRetry={() => window.location.reload()}
      />
    );
  }

  const isFiltered = search.trim().length > 0 || statusFilter !== "All";
  const hasNoRequests = !requestsLoading && requests.length === 0;
  const hasNoResults = !requestsLoading && requests.length > 0 && pagedRequests.length === 0;

  return (
    <div className="min-h-screen bg-background p-3 text-foreground sm:p-4 lg:p-[18px]">
      <div className="mx-auto flex w-full max-w-[min(100%,2200px)] gap-3 sm:gap-4 xl:gap-[18px]">
        <AppSidebar
          items={navItems}
          subscriptionCard={
            <SubscriptionSidebarCard
              planLabel={planLabel ?? "—"}
              activeConcurrency={activeRequestsForCard}
              maxActiveRequests={maxActiveRequestsForCard}
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
            title="My Requests"
            search={{
              id: "my-requests-search",
              value: search,
              onChange: setSearch,
              placeholder: "Search requests…",
            }}
            showSubmitTask={showSubmitTask}
            onSubmitTask={handleSubmitTask}
            unreadCount={unreadNotificationCount}
            userEmail={user?.email ?? "user"}
          />

          <section className="rounded-2xl border border-[#E0E0E0] bg-white px-4 py-5 dark:border-[#2A3444] dark:bg-[#141C27] sm:px-5">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-[24px] leading-none text-[#1E1E1E] dark:text-white">
                  Request List
                </h2>
                {!requestsLoading && requests.length > 0 ? (
                  <p className="mt-1 text-[13px] text-[#919191] dark:text-[#BFC1C5]">
                    {filteredRequests.length === requests.length
                      ? `${requests.length} total request${requests.length !== 1 ? "s" : ""}`
                      : `${filteredRequests.length} of ${requests.length} request${requests.length !== 1 ? "s" : ""}`}
                  </p>
                ) : null}
              </div>

              {!hasNoRequests ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <HoverTip label="Table view with sortable columns and pagination.">
                    <button
                      type="button"
                      onClick={() => setTableMode("list")}
                      className={cn(
                        tableMode === "list" ? toolbarPillActiveClass : toolbarPillIdleClass,
                      )}
                    >
                      <LayoutList className="size-5 shrink-0" />
                      List
                    </button>
                  </HoverTip>
                  <HoverTip label="Month calendar with request titles on the day they were submitted.">
                    <button
                      type="button"
                      onClick={() => setTableMode("calendar")}
                      className={cn(
                        tableMode === "calendar" ? toolbarPillActiveClass : toolbarPillIdleClass,
                      )}
                    >
                      <Calendar className="size-5 shrink-0" />
                      Calendar
                    </button>
                  </HoverTip>
                  <HoverTip
                    label={`Change sort field (now: ${sortFieldLabel}). Cycles: submitted date → title → status.`}
                  >
                    <button
                      type="button"
                      onClick={handleSortCycle}
                      className={toolbarIconButtonClass()}
                    >
                      <ArrowDownUp className="size-5" />
                    </button>
                  </HoverTip>
                  <HoverTip
                    label={
                      sortDirection === "asc"
                        ? "Ascending A→Z / old→new. Click to sort descending."
                        : "Descending Z→A / new→old. Click to sort ascending."
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
                      }
                      className={toolbarIconButtonClass()}
                    >
                      <SlidersHorizontal className="size-5" />
                    </button>
                  </HoverTip>
                </div>
              ) : null}
            </div>

            {!hasNoRequests && tableMode === "list" ? (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {STATUS_FILTERS.map((status) => (
                  <HoverTip
                    key={status}
                    label={
                      status === "All"
                        ? "Show every request in the list below."
                        : `Only show requests marked "${status}".`
                    }
                  >
                    <button
                      type="button"
                      className={cn(
                        "cursor-pointer rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                        statusFilter === status
                          ? "border-ark-red-500 bg-[rgba(255,0,0,0.07)] text-ark-red-500"
                          : "border-[#E3E3E3] bg-white text-[#545454] hover:bg-[#F9F9F9] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:text-[#BFC1C5] dark:hover:bg-[#2B323E]",
                      )}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status}
                    </button>
                  </HoverTip>
                ))}
              </div>
            ) : null}

            {/* Loading state */}
            {requestsLoading ? (
              <div className="rounded-xl border border-dashed border-[#D7D7D7]">
                <AppPageLoader variant="inline" className="min-h-[240px] py-12" />
              </div>
            ) : requestsError ? (
              /* Error state (partial — some requests loaded previously) */
              <div className="grid min-h-[200px] place-items-center rounded-xl border border-dashed border-[#D7D7D7] px-4 text-center text-[14px] text-[#CE3426]">
                {requestsError}
              </div>
            ) : hasNoRequests ? (
              /* Empty state — no requests at all */
              <EmptyState onSubmit={showSubmitTask ? handleSubmitTask : undefined} />
            ) : tableMode === "calendar" ? (
              /* Calendar view */
              <>
                <div className="hidden min-h-[380px] rounded-xl border border-[#ECECEC] bg-[#FAFAFA] p-4 dark:border-[#2F3744] dark:bg-[#1A1E25] lg:block">
                  <RequestCalendarGrid
                    items={sortedRequests.map((r) => ({
                      id: r.id,
                      title: r.title,
                      createdAtIso: r.createdAtIso,
                    }))}
                  />
                </div>
                <div className="min-h-[280px] rounded-xl border border-[#ECECEC] bg-[#FAFAFA] p-3 dark:border-[#2F3744] dark:bg-[#1A1E25] lg:hidden">
                  <RequestCalendarGrid
                    items={sortedRequests.map((r) => ({
                      id: r.id,
                      title: r.title,
                      createdAtIso: r.createdAtIso,
                    }))}
                  />
                </div>
              </>
            ) : (
              /* List view */
              <>
                {/* Desktop table */}
                <div className="hidden lg:block">
                  <div className="mb-2 flex h-[44px] items-center rounded-[30px] bg-[#2F3744] px-4 text-[14px] text-white dark:bg-[#2B323E]">
                    <div className="w-[28%]">Request Name</div>
                    <div className="w-[14%]">Status</div>
                    <div className="w-[18%]">Submitted Date</div>
                    <div className="w-[12%]">Priority</div>
                    <div className="w-[14%]">Assigned To</div>
                    <div className="w-[14%]">Last Update</div>
                  </div>

                  {hasNoResults ? (
                    <div className="grid min-h-[200px] place-items-center rounded-xl border border-dashed border-[#D7D7D7] text-[14px] text-[#666]">
                      {isFiltered
                        ? "No requests match your search and status filter."
                        : "No requests found."}
                    </div>
                  ) : (
                    <div className="overflow-y-auto pr-2">
                      {pagedRequests.map((item, idx) => (
                        <div
                          key={item.id}
                          className={cn(
                            "mb-0.5 flex h-[54px] items-center rounded-xl px-4 text-[14px] text-[#1E1E1E] dark:text-[#EAEBEC]",
                            idx % 2 === 1 ? "bg-[#F5F5F5] dark:bg-[#1A1E25]" : "",
                          )}
                        >
                          <div className="w-[28%] truncate font-medium">
                            <Link
                              href={`/requests/${item.id}/activity`}
                              className="hover:underline"
                            >
                              {item.title}
                            </Link>
                          </div>
                          <div className="w-[14%]">
                            <StatusPill status={item.status} />
                          </div>
                          <div className="w-[18%] font-medium">{item.createdDate}</div>
                          <div className="w-[12%] font-medium">{item.priority}</div>
                          <div className="w-[14%] truncate font-medium">{item.assignedTo}</div>
                          <div className="w-[14%] truncate font-medium">{item.lastUpdate}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mobile cards */}
                <div className="grid gap-2 lg:hidden">
                  {hasNoResults ? (
                    <div className="grid min-h-[180px] place-items-center rounded-xl border border-dashed border-[#D7D7D7] text-[14px] text-[#666]">
                      {isFiltered
                        ? "No requests match your search and status filter."
                        : "No requests found."}
                    </div>
                  ) : (
                    pagedRequests.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[#ECECEC] bg-white p-3 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.03)] dark:border-[#2F3744] dark:bg-[#1A1E25]"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <p className="font-medium text-[#1E1E1E] dark:text-[#EAEBEC]">
                            <Link
                              href={`/requests/${item.id}/activity`}
                              className="hover:underline"
                            >
                              {item.title}
                            </Link>
                          </p>
                          <StatusPill status={item.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
                          <p className="text-[#777] dark:text-[#9FA3A9]">Created</p>
                          <p className="text-[#1E1E1E] dark:text-[#EAEBEC]">{item.createdDate}</p>
                          <p className="text-[#777] dark:text-[#9FA3A9]">Priority</p>
                          <p className="text-[#1E1E1E] dark:text-[#EAEBEC]">{item.priority}</p>
                          <p className="text-[#777] dark:text-[#9FA3A9]">Assigned</p>
                          <p className="text-[#1E1E1E] dark:text-[#EAEBEC]">{item.assignedTo}</p>
                          <p className="text-[#777] dark:text-[#9FA3A9]">Last Update</p>
                          <p className="text-[#1E1E1E] dark:text-[#EAEBEC]">{item.lastUpdate}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {!hasNoResults ? (
                  <TablePagination
                    className="mt-4"
                    page={listPage}
                    totalPages={listTotalPages}
                    onPageChange={setListPage}
                  />
                ) : null}
              </>
            )}
          </section>
        </main>
      </div>

      {showLimitReachedModal ? (
        <RequestLimitReachedModal
          maxActiveRequests={maxActiveRequestsForCard}
          onClose={() => setShowLimitReachedModal(false)}
          onUpgradePlan={() => router.push("/subscription")}
          onViewActiveRequests={() => setShowLimitReachedModal(false)}
        />
      ) : null}
    </div>
  );
}
