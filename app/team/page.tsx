"use client";

/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Search,
  ArrowUpDown,
  MoreHorizontal,
  Loader2,
  X,
  ChevronDown,
  Shield,
  Users,
} from "lucide-react";

import {
  AppPageLoader,
  AppShellHeader,
  AppSidebar,
  MobileNavChips,
  SubscriptionSidebarCard,
} from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiGet, apiGetRaw, apiPatch } from "@/lib/http/request";
import { navItemsForRole } from "@/lib/navigation/app-nav";
import { createClient } from "@/lib/supabase/client";
import { useTeamSidebarSubscription } from "@/hooks/use-team-sidebar-subscription";
import { PLAN_CONFIG, DEFAULT_PLAN_TYPE, type PlanType } from "@/lib/config/plans";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────

type TeamRole = "owner" | "admin" | "member" | "operator";
type SortKey = "name" | "role" | "joined";
type SortDir = "asc" | "desc";

type Member = {
  id: string;
  user_id: string;
  role: TeamRole;
  created_at: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

const ROLES: TeamRole[] = ["owner", "admin", "member", "operator"];

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  operator: "Operator",
};

const ROLE_COLORS: Record<TeamRole, string> = {
  owner: "border-[#FABA17] bg-[rgba(250,186,23,0.1)] text-[#C89000]",
  admin: "border-[#508CF0] bg-[rgba(80,140,240,0.1)] text-[#508CF0]",
  member: "border-[#E0E0E0] bg-[#F9F9F9] text-[#555] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:text-[#BFC1C5]",
  operator: "border-[#9B59B6] bg-[rgba(155,89,182,0.1)] text-[#9B59B6]",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function memberName(m: Member): string {
  return m.display_name ?? m.full_name ?? m.email ?? m.user_id.slice(0, 8);
}

function memberInitials(m: Member): string {
  const name = m.display_name ?? m.full_name ?? m.email ?? "?";
  return name.slice(0, 2).toUpperCase();
}

function dicebear(seed: string) {
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(seed)}`;
}

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Role pill ─────────────────────────────────────────────────────────────────

function RolePill({ role }: { role: TeamRole }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-medium", ROLE_COLORS[role])}>
      {role === "owner" && <Shield className="size-3" />}
      {ROLE_LABELS[role]}
    </span>
  );
}

// ── Invite modal ──────────────────────────────────────────────────────────────

function InviteModal({
  teamId,
  onClose,
  onInvited,
}: {
  teamId: string;
  onClose: () => void;
  onInvited: (member: Member) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<TeamRole>("member");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    if (!email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const json = (await res.json()) as { data?: Member; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to add member"); return; }
      onInvited(json.data!);
      onClose();
    } catch { setError("Network error. Please try again."); }
    finally { setSaving(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-xl dark:border-[#2A3444] dark:bg-[#141C27]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[20px] text-[#1E1E1E] dark:text-white">Invite Team Member</h2>
          <button type="button" onClick={onClose} className="grid size-7 cursor-pointer place-items-center rounded-full hover:bg-[#F5F5F5] dark:hover:bg-[#1A1E25]">
            <X className="size-4 text-[#919191]" />
          </button>
        </div>
        <p className="mt-1 text-[13px] text-[#919191] dark:text-[#BFC1C5]">
          The user must already have an ARKHV account.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#5A5A60]">Email address</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
              placeholder="teammate@company.com"
              className="h-10 rounded-full border-[#CFCFD2] text-[14px]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-semibold text-[#5A5A60]">Role</label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as TeamRole)}
                className="h-10 w-full cursor-pointer appearance-none rounded-full border border-[#CFCFD2] bg-white px-3 text-[14px] text-[#252527] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:text-[#EAEBEC]"
              >
                {ROLES.filter((r) => r !== "owner").map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#919191]" />
            </div>
            <p className="mt-1 text-[11px] text-[#919191]">
              {role === "admin" ? "Can manage team members and settings." :
               role === "operator" ? "Can manage requests and deliverables." :
               "Standard access to requests and brand assets."}
            </p>
          </div>
        </div>

        {error ? <p className="mt-3 text-[13px] text-ark-red-500">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 cursor-pointer rounded-full bg-[#F6F6F6] px-5 text-[13px] font-medium text-[#555] hover:bg-[#ECECEC] dark:bg-[#1A1E25] dark:text-[#BFC1C5]"
          >
            Cancel
          </button>
          <Button
            variant="primary"
            size="sm"
            className="h-9 cursor-pointer rounded-full px-5 text-[13px]"
            onClick={() => void submit()}
            disabled={!email.trim() || saving}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Add Member"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Action menu ───────────────────────────────────────────────────────────────

function ActionMenu({
  member,
  currentUserId,
  teamId,
  onRoleChange,
  onRemove,
}: {
  member: Member;
  currentUserId: string;
  teamId: string;
  onRoleChange: (userId: string, role: TeamRole) => void;
  onRemove: (userId: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const isSelf = member.user_id === currentUserId;
  const isOwner = member.role === "owner";

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function changeRole(role: TeamRole) {
    setOpen(false);
    try {
      await apiPatch(`/api/teams/${teamId}/members/${member.user_id}`, { role });
      onRoleChange(member.user_id, role);
    } catch { setError("Failed to update role"); }
  }

  async function remove() {
    setOpen(false);
    setRemoving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${member.user_id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "Failed to remove member");
        return;
      }
      onRemove(member.user_id);
    } catch { setError("Network error"); }
    finally { setRemoving(false); }
  }

  return (
    <div ref={ref} className="relative">
      {error ? <p className="absolute right-8 top-0 z-10 w-48 text-right text-[11px] text-ark-red-500">{error}</p> : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={removing}
        className="grid size-7 cursor-pointer place-items-center rounded-full text-[#919191] transition-colors hover:bg-[#F5F5F5] hover:text-[#1E1E1E] dark:hover:bg-[#1A1E25] dark:hover:text-[#EAEBEC]"
      >
        {removing ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+4px)] z-30 w-44 overflow-hidden rounded-xl border border-[#E0E0E0] bg-white shadow-lg dark:border-[#2A3444] dark:bg-[#141C27]">
          {!isOwner && (
            <>
              <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#919191]">Change Role</p>
              {ROLES.filter((r) => r !== "owner" && r !== member.role).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => void changeRole(r)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#1E1E1E] transition-colors hover:bg-[#F5F5F5] dark:text-[#EAEBEC] dark:hover:bg-[#1A1E25]"
                >
                  <RolePill role={r} />
                </button>
              ))}
              <div className="mx-3 border-t border-[#F0F0F0] dark:border-[#2A3444]" />
            </>
          )}
          <button
            type="button"
            onClick={() => void remove()}
            disabled={isSelf || isOwner}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ark-red-500 transition-colors hover:bg-[rgba(255,0,0,0.05)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSelf ? "Can't remove yourself" : isOwner ? "Can't remove owner" : "Remove from team"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const router = useRouter();

  const [user, setUser] = React.useState<User | null>(null);
  const [appRole, setAppRole] = React.useState<"client" | "team" | "admin" | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const [teamId, setTeamId] = React.useState<string | null>(null);
  const [teamName, setTeamName] = React.useState("Team");
  const [members, setMembers] = React.useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = React.useState(true);
  const [membersError, setMembersError] = React.useState<string | null>(null);

  const [planType, setPlanType] = React.useState<PlanType>(DEFAULT_PLAN_TYPE);
  const [maxSeats, setMaxSeats] = React.useState<number>(1);

  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<TeamRole | "all">("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("joined");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [showInvite, setShowInvite] = React.useState(false);

  const navItems = React.useMemo(() => navItemsForRole(appRole), [appRole]);
  const showSubmitTask = appRole === "client";
  const sidebarSub = useTeamSidebarSubscription(supabase, user?.id);
  const planCfg = PLAN_CONFIG[planType];

  // ── Load ──────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    void (async () => {
      try {
        const { data: authData, error } = await supabase.auth.getUser();
        if (error || !authData.user) { router.push("/auth"); return; }
        setUser(authData.user);
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
          .from("team_members").select("team_id, teams(name)").eq("user_id", user.id).limit(1).maybeSingle();
        const tid = memberRow?.team_id as string | null;
        if (!tid) return;
        setTeamId(tid);

        const rawTeams = memberRow?.teams;
        if (rawTeams && typeof rawTeams === "object" && "name" in rawTeams && typeof (rawTeams as { name: unknown }).name === "string") {
          setTeamName((rawTeams as { name: string }).name);
        }

        // Load plan
        try {
          const teamData = await apiGet<{ max_seats?: number; seat_count?: number }>(`/api/teams/${tid}`);
          if (typeof teamData?.max_seats === "number") setMaxSeats(teamData.max_seats);
          const { data: sub } = await supabase.from("subscriptions").select("plan_type").eq("team_id", tid).maybeSingle();
          if (sub?.plan_type) setPlanType(sub.plan_type as PlanType);
        } catch {}
      } catch {}
    })();
  }, [user, supabase]);

  React.useEffect(() => {
    if (!teamId) return;
    setMembersLoading(true);
    setMembersError(null);
    void apiGet<Member[]>(`/api/teams/${teamId}/members`)
      .then((data) => setMembers(data ?? []))
      .catch((e) => setMembersError(e instanceof Error ? e.message : "Failed to load members"))
      .finally(() => setMembersLoading(false));
  }, [teamId]);

  // ── Derived list ──────────────────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return members.filter((m) => {
      const byRole = roleFilter === "all" || m.role === roleFilter;
      const bySearch = !needle || memberName(m).toLowerCase().includes(needle) || (m.email ?? "").toLowerCase().includes(needle);
      return byRole && bySearch;
    });
  }, [members, search, roleFilter]);

  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va = "", vb = "";
      if (sortKey === "name") { va = memberName(a).toLowerCase(); vb = memberName(b).toLowerCase(); }
      else if (sortKey === "role") { va = a.role; vb = b.role; }
      else { va = a.created_at; vb = b.created_at; }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-40" />;
    return <ArrowUpDown className={cn("size-3", sortDir === "asc" ? "text-ark-red-500" : "text-[#508CF0]")} />;
  }

  if (loading || sidebarSub.loading) return <AppPageLoader variant="shell" />;

  const seatsUsed = members.length;
  const seatsPct = maxSeats > 0 ? Math.min(100, Math.round((seatsUsed / maxSeats) * 100)) : 0;
  const canManage = appRole === "admin" || members.find((m) => m.user_id === user?.id && (m.role === "owner" || m.role === "admin"));

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
            title="Team"
            search={{
              id: "team-search",
              value: search,
              onChange: setSearch,
              placeholder: "Search members…",
            }}
            showSubmitTask={showSubmitTask}
            onSubmitTask={() => router.push("/submit-request")}
            unreadCount={unreadCount}
            userEmail={user?.email ?? "user"}
          />

          {/* Seats + invite header */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#E0E0E0] bg-white px-5 py-4 dark:border-[#2A3444] dark:bg-[#141C27] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid size-10 place-items-center rounded-xl border border-[#FABA17] bg-[rgba(250,186,23,0.06)]">
                <Users className="size-5 text-[#FABA17]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#1E1E1E] dark:text-white">{teamName}</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-[#F0F0F0] dark:bg-[#2A3444]">
                    <div
                      className={cn("h-full rounded-full transition-all", seatsPct >= 90 ? "bg-ark-red-500" : seatsPct >= 70 ? "bg-[#FABA17]" : "bg-[#10CB29]")}
                      style={{ width: `${seatsPct}%` }}
                    />
                  </div>
                  <p className="text-[12px] text-[#919191] dark:text-[#BFC1C5]">
                    {seatsUsed} / {maxSeats} seat{maxSeats !== 1 ? "s" : ""} used · {planCfg.display_name} plan
                  </p>
                </div>
              </div>
            </div>

            {canManage ? (
              <Button
                variant="primary"
                size="sm"
                className="flex h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-[13px] shadow-[0px_4px_14px_0px_rgba(255,0,0,0.12)]"
                onClick={() => setShowInvite(true)}
                disabled={seatsUsed >= maxSeats}
              >
                <UserPlus className="size-4" />
                Invite Member
              </Button>
            ) : null}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1.5">
              {(["all", ...ROLES] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                    roleFilter === r
                      ? "border-ark-red-500 bg-[rgba(255,0,0,0.07)] text-ark-red-500"
                      : "border-[#E3E3E3] bg-white text-[#545454] hover:bg-[#F9F9F9] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:text-[#BFC1C5]",
                  )}
                >
                  {r === "all" ? "All" : ROLE_LABELS[r]}
                  {r !== "all" ? (
                    <span className="ml-1 text-[10px] opacity-60">
                      {members.filter((m) => m.role === r).length}
                    </span>
                  ) : (
                    <span className="ml-1 text-[10px] opacity-60">{members.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <section className="rounded-2xl border border-[#E0E0E0] bg-white dark:border-[#2A3444] dark:bg-[#141C27]">
            {/* Desktop header */}
            <div className="hidden grid-cols-[2fr_2fr_1fr_1fr_auto] items-center gap-4 rounded-t-2xl bg-[#2F3744] px-5 py-3 text-[12px] font-medium text-white dark:bg-[#2B323E] lg:grid">
              <button type="button" onClick={() => toggleSort("name")} className="flex items-center gap-1 text-left">
                Member <SortIcon col="name" />
              </button>
              <span>Email</span>
              <button type="button" onClick={() => toggleSort("role")} className="flex items-center gap-1">
                Role <SortIcon col="role" />
              </button>
              <button type="button" onClick={() => toggleSort("joined")} className="flex items-center gap-1">
                Joined <SortIcon col="joined" />
              </button>
              <span>Actions</span>
            </div>

            {/* Rows */}
            {membersLoading ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <Loader2 className="size-6 animate-spin text-[#B0B0B0]" />
              </div>
            ) : membersError ? (
              <p className="px-5 py-8 text-center text-[14px] text-ark-red-500">{membersError}</p>
            ) : sorted.length === 0 ? (
              <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-center">
                <Users className="size-8 text-[#D0D0D0]" />
                <p className="text-[13px] text-[#919191]">
                  {search || roleFilter !== "all" ? "No members match your filter." : "No team members yet."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#F0F0F0] dark:divide-[#2A3444]">
                {sorted.map((m) => {
                  const isSelf = m.user_id === user?.id;
                  return (
                    <li key={m.id}>
                      {/* Desktop row */}
                      <div className="hidden grid-cols-[2fr_2fr_1fr_1fr_auto] items-center gap-4 px-5 py-3.5 lg:grid">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="size-8 shrink-0 overflow-hidden rounded-full border border-[#E6E6E6] bg-[#F5F5F5] dark:border-[#2F3744]">
                            <img
                              src={m.avatar_url ?? dicebear(m.email ?? m.user_id)}
                              alt=""
                              className="size-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-[#1E1E1E] dark:text-[#EAEBEC]">
                              {memberName(m)}
                              {isSelf ? <span className="ml-1.5 text-[11px] text-[#919191]">(you)</span> : null}
                            </p>
                          </div>
                        </div>
                        <p className="truncate text-[13px] text-[#555] dark:text-[#BFC1C5]">
                          {m.email ?? "—"}
                        </p>
                        <RolePill role={m.role} />
                        <p className="text-[12px] text-[#919191] dark:text-[#BFC1C5]">
                          {formatJoined(m.created_at)}
                        </p>
                        <div className="flex justify-end">
                          {canManage ? (
                            <ActionMenu
                              member={m}
                              currentUserId={user?.id ?? ""}
                              teamId={teamId!}
                              onRoleChange={(uid, role) =>
                                setMembers((prev) => prev.map((x) => x.user_id === uid ? { ...x, role } : x))
                              }
                              onRemove={(uid) =>
                                setMembers((prev) => prev.filter((x) => x.user_id !== uid))
                              }
                            />
                          ) : null}
                        </div>
                      </div>

                      {/* Mobile card */}
                      <div className="flex items-start gap-3 p-4 lg:hidden">
                        <div className="size-9 shrink-0 overflow-hidden rounded-full border border-[#E6E6E6] bg-[#F5F5F5] dark:border-[#2F3744]">
                          <img src={m.avatar_url ?? dicebear(m.email ?? m.user_id)} alt="" className="size-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[14px] font-medium text-[#1E1E1E] dark:text-[#EAEBEC]">
                              {memberName(m)}{isSelf ? <span className="ml-1 text-[11px] text-[#919191]">(you)</span> : null}
                            </p>
                            {canManage ? (
                              <ActionMenu
                                member={m}
                                currentUserId={user?.id ?? ""}
                                teamId={teamId!}
                                onRoleChange={(uid, role) =>
                                  setMembers((prev) => prev.map((x) => x.user_id === uid ? { ...x, role } : x))
                                }
                                onRemove={(uid) =>
                                  setMembers((prev) => prev.filter((x) => x.user_id !== uid))
                                }
                              />
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-[#919191]">{m.email ?? "—"}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <RolePill role={m.role} />
                            <span className="text-[11px] text-[#B0B0B0]">Joined {formatJoined(m.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Footer */}
            {!membersLoading && !membersError && sorted.length > 0 ? (
              <div className="border-t border-[#F0F0F0] px-5 py-3 dark:border-[#2A3444]">
                <p className="text-[12px] text-[#919191] dark:text-[#BFC1C5]">
                  Showing {sorted.length} of {members.length} member{members.length !== 1 ? "s" : ""}
                </p>
              </div>
            ) : null}
          </section>
        </main>
      </div>

      {showInvite && teamId ? (
        <InviteModal
          teamId={teamId}
          onClose={() => setShowInvite(false)}
          onInvited={(m) => setMembers((prev) => [...prev, m])}
        />
      ) : null}
    </div>
  );
}
