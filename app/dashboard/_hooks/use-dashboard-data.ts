import type { SupabaseClient, User } from "@supabase/supabase-js";
import * as React from "react";

import { apiGet, apiGetRaw } from "@/lib/http/request";
import { DEFAULT_PLAN_TYPE, PLAN_CONFIG, type PlanType } from "@/lib/config/plans";

export type AppRole = "client" | "team" | "admin";

export type RequestStatus = "New" | "In Progress" | "Done";

export type RequestItem = {
  id: string;
  title: string;
  status: RequestStatus;
  createdDate: string;
  createdAtIso: string | null;
  priority: string;
  assignedTo: string;
  lastUpdate: string;
};

type RequestApiRow = {
  id: string;
  title: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  priority: string | null;
};

function mapApiStatus(value: string | null): RequestStatus {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "completed" || normalized === "done" || normalized === "closed") {
    return "Done";
  }
  if (normalized === "in_progress" || normalized === "review") {
    return "In Progress";
  }
  return "New";
}

export function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export type UsageAggregate = {
  request_count_sum: number;
  active_concurrency_sum: number;
  max_active_requests_sum: number;
  max_requests_per_period_sum: number | null;
  period_end_earliest: string | null;
};

export function useDashboardData(params: {
  supabase: SupabaseClient;
  router: { push: (path: string) => void };
}): {
  user: User | null;
  loading: boolean;
  appRole: AppRole | null;
  requests: RequestItem[];
  requestsLoading: boolean;
  requestsError: string | null;
  unreadNotificationCount: number;
  usageAggregate: UsageAggregate | null;
  planLabel: string | null;
} {
  const { supabase, router } = params;

  const [user, setUser] = React.useState<User | null>(null);
  const [authResolved, setAuthResolved] = React.useState(false);
  const [requestsReady, setRequestsReady] = React.useState(false);
  const [usageReady, setUsageReady] = React.useState(false);
  const [appRole, setAppRole] = React.useState<AppRole | null>(null);

  const [requests, setRequests] = React.useState<RequestItem[]>([]);
  const [requestsLoading, setRequestsLoading] = React.useState(true);
  const [requestsError, setRequestsError] = React.useState<string | null>(null);

  const [unreadNotificationCount, setUnreadNotificationCount] = React.useState(0);
  const [usageAggregate, setUsageAggregate] = React.useState<UsageAggregate | null>(null);
  const [planLabel, setPlanLabel] = React.useState<string | null>(null);

  React.useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          router.push("/auth");
          return;
        }

        setUser(data.user);
        setRequestsReady(false);
        setUsageReady(false);

        try {
          const me = await apiGet<{ app_role?: AppRole }>("/api/me");
          setAppRole(me.app_role ?? "client");
        } catch {
          setAppRole("client");
        }
      } finally {
        setAuthResolved(true);
      }
    };
    void getUser();
  }, [router, supabase]);

  React.useEffect(() => {
    if (!user) return;
    const loadRequests = async () => {
      setRequestsLoading(true);
      setRequestsError(null);
      try {
        const rows = await apiGet<RequestApiRow[]>("/api/requests");
        const mapped = (rows ?? []).map((row) => ({
          id: row.id,
          title: row.title?.trim() || "Untitled request",
          status: mapApiStatus(row.status),
          createdDate: formatDate(row.created_at),
          createdAtIso:
            row.created_at != null && typeof row.created_at === "string" ? row.created_at : null,
          priority: row.priority?.trim() || "-",
          assignedTo: "-",
          lastUpdate: formatDate(row.updated_at ?? row.created_at),
        }));
        setRequests(mapped);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load requests";
        setRequestsError(message);
      } finally {
        setRequestsLoading(false);
        setRequestsReady(true);
      }
    };
    void loadRequests();
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    const loadNotifications = async () => {
      try {
        const payload = await apiGetRaw<{ unread_count?: number }>(
          "/api/notifications?limit=1"
        );
        if (typeof payload.unread_count === "number") {
          setUnreadNotificationCount(payload.unread_count);
        }
      } catch {
        /* ignore badge failures */
      }
    };
    void loadNotifications();
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const { data: teamRows, error: teamErr } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", user.id);

        if (teamErr) {
          setUsageReady(true);
          return;
        }
        const teamIds = Array.from(
          new Set(
            (teamRows ?? [])
              .map((r: { team_id: unknown }) =>
                typeof r.team_id === "string" ? r.team_id : null
              )
              .filter(Boolean)
          )
        ) as string[];

        if (teamIds.length === 0) {
          setUsageAggregate({
            request_count_sum: 0,
            active_concurrency_sum: 0,
            max_active_requests_sum: 0,
            max_requests_per_period_sum: PLAN_CONFIG[DEFAULT_PLAN_TYPE].max_requests_per_period,
            period_end_earliest: null,
          });
          setPlanLabel(null);
          setUsageReady(true);
          return;
        }

        const usageResponses = await Promise.all(
          teamIds.map(async (tid) => {
            try {
              return await apiGet<{
                period: { start: string; end: string };
                request_count: number;
                active_concurrency: number;
                limits: {
                  max_active_requests: number;
                  max_seats: number;
                  max_requests_per_period: number | null;
                };
              }>(`/api/teams/${tid}/usage`);
            } catch {
              return null;
            }
          })
        );

        const valid = usageResponses.filter(
          (x): x is NonNullable<typeof x> => x != null
        );
        if (valid.length === 0) {
          setUsageAggregate({
            request_count_sum: 0,
            active_concurrency_sum: 0,
            max_active_requests_sum: 0,
            max_requests_per_period_sum: PLAN_CONFIG[DEFAULT_PLAN_TYPE].max_requests_per_period,
            period_end_earliest: null,
          });
          setPlanLabel(PLAN_CONFIG[DEFAULT_PLAN_TYPE].display_name);
          setUsageReady(true);
          return;
        }

        const request_count_sum = valid.reduce((acc, x) => acc + (x.request_count ?? 0), 0);
        const active_concurrency_sum = valid.reduce(
          (acc, x) => acc + (x.active_concurrency ?? 0),
          0
        );
        const max_active_requests_sum = valid.reduce(
          (acc, x) => acc + (x.limits?.max_active_requests ?? 0),
          0
        );
        const max_requests_per_period_sum = valid.some(
          (x) => x.limits?.max_requests_per_period == null
        )
          ? null
          : valid.reduce((acc, x) => acc + (x.limits?.max_requests_per_period ?? 0), 0);

        const earliestEnd =
          valid
            .map((x) => x.period?.end)
            .filter((d): d is string => typeof d === "string" && d.length > 0)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;

        try {
          const { data: subRows } = await supabase
            .from("subscriptions")
            .select("plan_type")
            .in("team_id", teamIds);

          const planTypes = Array.from(
            new Set(
              (subRows ?? [])
                .map((r: { plan_type: unknown }) =>
                  typeof r.plan_type === "string" ? r.plan_type : null
                )
                .filter(Boolean)
            )
          ) as string[];

          if (planTypes.length === 1) {
            const planType = planTypes[0] as PlanType;
            const cfg = PLAN_CONFIG[planType];
            if (cfg) setPlanLabel(cfg.display_name);
          } else if (planTypes.length > 1) {
            setPlanLabel("Multiple Plans");
          } else {
            setPlanLabel(PLAN_CONFIG[DEFAULT_PLAN_TYPE].display_name);
          }
        } catch {
          setPlanLabel(null);
        }

        setUsageAggregate({
          request_count_sum,
          active_concurrency_sum,
          max_active_requests_sum,
          max_requests_per_period_sum,
          period_end_earliest: earliestEnd,
        });
        setUsageReady(true);
      } catch {
        setUsageReady(true);
      }
    })();
  }, [user, supabase]);

  const loading = !authResolved || (user != null && (!requestsReady || !usageReady));

  return {
    user,
    loading,
    appRole,
    requests,
    requestsLoading,
    requestsError,
    unreadNotificationCount,
    usageAggregate,
    planLabel,
  };
}

