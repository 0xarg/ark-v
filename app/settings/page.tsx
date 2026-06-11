"use client";

/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Lock,
  Bell,
  CreditCard,
  AlertTriangle,
  Camera,
  Check,
  ChevronRight,
  Loader2,
  LogOut,
  ExternalLink,
} from "lucide-react";

import {
  AppPageLoader,
  AppShellHeader,
  AppSidebar,
  MobileNavChips,
  SubscriptionSidebarCard,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet, apiGetRaw, apiPost } from "@/lib/http/request";
import { putFileToSignedUrl } from "@/lib/uploads/put-signed-url";
import { navItemsForRole } from "@/lib/navigation/app-nav";
import { createClient } from "@/lib/supabase/client";
import { useTeamSidebarSubscription } from "@/hooks/use-team-sidebar-subscription";
import { PLAN_CONFIG, formatPlanPrice, requestLimitLabel, type PlanType } from "@/lib/config/plans";
import { cn } from "@/lib/utils";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// ── Types ────────────────────────────────────────────────────────────────────

type AppRole = "client" | "team" | "admin";
type SettingsTab = "profile" | "account" | "notifications" | "subscription" | "danger";

type ProfileData = {
  full_name: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  notification_prefs: NotificationPrefs;
};

type NotificationPrefs = {
  email_request_update?: boolean;
  email_request_completed?: boolean;
  email_new_message?: boolean;
  email_team_invite?: boolean;
  inapp_all?: boolean;
};

const DEFAULT_NOTIF_PREFS: Required<NotificationPrefs> = {
  email_request_update: true,
  email_request_completed: true,
  email_new_message: true,
  email_team_invite: true,
  inapp_all: true,
};

// ── Default avatar seeds (Dicebear adventurer-neutral) ────────────────────────

const DEFAULT_SEEDS = ["cosmos", "whisper", "angel", "luna", "charlie", "nova", "pixel", "storm"];

function dicebearUrl(seed: string) {
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(seed)}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resizeImageFile(file: File, maxSize = 256): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      }, "image/jpeg", 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

// ── Section nav ───────────────────────────────────────────────────────────────

const TABS: Array<{ id: SettingsTab; label: string; icon: React.ElementType }> = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

// ── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[#F0F0F0] last:border-b-0 dark:border-[#2A3444]">
      <div>
        <p className="text-[14px] font-medium text-[#1E1E1E] dark:text-[#EAEBEC]">{label}</p>
        {hint ? <p className="mt-0.5 text-[12px] text-[#919191] dark:text-[#BFC1C5]">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
          checked ? "bg-ark-red-500" : "bg-[#D0D5DD] dark:bg-[#3A4050]",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

// ── Form field ────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-semibold text-[#5A5A60]">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-[12px] text-[#919191]">{hint}</p> : null}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<SupabaseUser | null>(null);
  const [appRole, setAppRole] = React.useState<AppRole | null>(null);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("profile");

  const navItems = React.useMemo(() => navItemsForRole(appRole), [appRole]);
  const showSubmitTask = appRole === "client";
  const sidebarSub = useTeamSidebarSubscription(supabase, user?.id);

  // Profile state
  const [profile, setProfile] = React.useState<ProfileData>({
    full_name: null,
    display_name: null,
    bio: null,
    avatar_url: null,
    notification_prefs: DEFAULT_NOTIF_PREFS,
  });
  const [profileDirty, setProfileDirty] = React.useState(false);
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [profileSaved, setProfileSaved] = React.useState(false);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  // Avatar
  const [showAvatarPicker, setShowAvatarPicker] = React.useState(false);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  // Notifications state
  const [notifPrefs, setNotifPrefs] = React.useState<Required<NotificationPrefs>>(DEFAULT_NOTIF_PREFS);
  const [notifSaving, setNotifSaving] = React.useState(false);
  const [notifSaved, setNotifSaved] = React.useState(false);

  // Subscription
  const [planType, setPlanType] = React.useState<PlanType | null>(null);
  const billingPortalUrl = React.useMemo(() => {
    const v = process.env.NEXT_PUBLIC_BILLING_PORTAL_URL;
    return v && v.trim() ? v.trim() : null;
  }, []);

  // Danger zone
  const [deleteEmail, setDeleteEmail] = React.useState("");
  const [deleteConfirming, setDeleteConfirming] = React.useState(false);

  // ── Auth + load ──────────────────────────────────────────────────────────

  React.useEffect(() => {
    void (async () => {
      try {
        const { data: meData, error } = await supabase.auth.getUser();
        if (error || !meData.user) { router.push("/auth"); return; }
        setUser(meData.user);

        const [meRes, profileRes] = await Promise.all([
          apiGet<{ app_role?: AppRole }>("/api/me").catch(() => ({ app_role: "client" as AppRole })),
          apiGet<ProfileData>("/api/profile").catch(() => null),
        ]);

        setAppRole(meRes.app_role ?? "client");

        if (profileRes) {
          setProfile(profileRes);
          setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...profileRes.notification_prefs });
        }

        // Subscription
        try {
          const { data: subRow } = await supabase
            .from("subscriptions")
            .select("plan_type")
            .maybeSingle();
          if (subRow?.plan_type) setPlanType(subRow.plan_type as PlanType);
        } catch { /* ignore */ }
      } finally {
        setLoading(false);
      }
    })();
  }, [router, supabase]);

  React.useEffect(() => {
    if (!user) return;
    void apiGetRaw<{ unread_count?: number }>("/api/notifications?limit=1")
      .then((p) => { if (typeof p.unread_count === "number") setUnreadCount(p.unread_count); })
      .catch(() => {});
  }, [user]);

  // ── Profile helpers ───────────────────────────────────────────────────────

  function updateProfile(patch: Partial<ProfileData>) {
    setProfile((prev) => ({ ...prev, ...patch }));
    setProfileDirty(true);
    setProfileSaved(false);
  }

  async function saveProfile() {
    setProfileSaving(true);
    setProfileError(null);
    try {
      await apiPost("/api/profile", {
        full_name: profile.full_name,
        display_name: profile.display_name,
        bio: profile.bio,
      });
      setProfileDirty(false);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setProfileSaving(false);
    }
  }

  async function selectAvatar(url: string) {
    setAvatarUploading(true);
    try {
      await apiPost("/api/profile", { avatar_url: url });
      setProfile((prev) => ({ ...prev, avatar_url: url }));
    } catch { /* ignore */ } finally {
      setAvatarUploading(false);
      setShowAvatarPicker(false);
    }
  }

  async function uploadAvatarFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 4 * 1024 * 1024) {
      setProfileError("Image must be under 4 MB");
      return;
    }
    setAvatarUploading(true);
    setShowAvatarPicker(false);
    try {
      const blob = await resizeImageFile(file);
      const resizedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const signed = await apiPost<{ upload_url: string; avatar_url: string }>(
        "/api/profile/avatar-url",
        { content_type: "image/jpeg" },
      );
      await putFileToSignedUrl({ uploadUrl: signed.upload_url, file: resizedFile });
      await apiPost("/api/profile", { avatar_url: `${signed.avatar_url}?v=${Date.now()}` });
      setProfile((prev) => ({ ...prev, avatar_url: `${signed.avatar_url}?v=${Date.now()}` }));
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  // ── Notification save ─────────────────────────────────────────────────────

  async function saveNotifications() {
    setNotifSaving(true);
    try {
      await apiPost("/api/profile", { notification_prefs: notifPrefs });
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 3000);
    } catch { /* ignore */ } finally {
      setNotifSaving(false);
    }
  }

  // ── Delete account ────────────────────────────────────────────────────────

  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  async function handleDeleteAccount() {
    if (deleteEmail !== user?.email) return;
    setDeleteConfirming(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/profile/delete", { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setDeleteError(json.error ?? "Failed to delete account. Please try again or contact support.");
        return;
      }
      // Auth user deleted server-side — sign out session and redirect
      await supabase.auth.signOut();
      router.push("/");
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleteConfirming(false);
    }
  }

  if (loading || sidebarSub.loading) return <AppPageLoader variant="shell" />;

  const avatarSrc = profile.avatar_url ?? dicebearUrl(user?.email ?? "user");
  const planCfg = planType ? PLAN_CONFIG[planType] : null;

  return (
    <div className="min-h-screen bg-background p-3 text-foreground sm:p-4 lg:p-[18px]">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void uploadAvatarFile(f);
        }}
      />

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
            title="Settings"
            search={null}
            showSubmitTask={showSubmitTask}
            onSubmitTask={() => router.push("/submit-request")}
            unreadCount={unreadCount}
            userEmail={user?.email ?? "user"}
          />

          <div className="flex gap-4 lg:gap-5">
            {/* ── Sidebar nav ── */}
            <nav className="hidden w-[200px] shrink-0 md:block">
              <ul className="space-y-0.5">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setActiveTab(id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-colors",
                        activeTab === id
                          ? id === "danger"
                            ? "bg-[rgba(255,0,0,0.08)] text-ark-red-500"
                            : "bg-[#2F3744] text-white dark:bg-[#2B323E]"
                          : id === "danger"
                            ? "text-ark-red-500 hover:bg-[rgba(255,0,0,0.05)]"
                            : "text-[#666] hover:bg-[#F5F5F5] dark:text-[#BFC1C5] dark:hover:bg-[#1A1E25]",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {label}
                      {activeTab === id ? null : <ChevronRight className="ml-auto size-3.5 opacity-40" />}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* ── Mobile tab strip ── */}
            <div className="w-full md:hidden">
              <div className="mb-3 flex overflow-x-auto gap-1.5 pb-0.5">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                      activeTab === id
                        ? id === "danger"
                          ? "border-ark-red-500 bg-[rgba(255,0,0,0.08)] text-ark-red-500"
                          : "border-[#2F3744] bg-[#2F3744] text-white dark:bg-[#2B323E]"
                        : id === "danger"
                          ? "border-[rgba(255,0,0,0.2)] text-ark-red-500"
                          : "border-[#E3E3E3] text-[#555] dark:border-[#2F3744] dark:text-[#BFC1C5]",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Content ── */}
            <div className="min-w-0 flex-1 hidden md:block">
              {renderSection()}
            </div>
            <div className="min-w-0 flex-1 md:hidden">
              {renderSection()}
            </div>
          </div>
        </main>
      </div>

      {/* Avatar picker modal */}
      {showAvatarPicker ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAvatarPicker(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-xl dark:border-[#2A3444] dark:bg-[#141C27]">
            <h2 className="font-display text-[20px] text-[#1E1E1E] dark:text-white">Choose Avatar</h2>
            <p className="mt-1 text-[13px] text-[#919191] dark:text-[#BFC1C5]">
              Pick a default or upload your own.
            </p>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {DEFAULT_SEEDS.map((seed) => {
                const url = dicebearUrl(seed);
                const isActive = profile.avatar_url === url;
                return (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => void selectAvatar(url)}
                    className={cn(
                      "relative overflow-hidden rounded-full border-2 transition-all",
                      isActive ? "border-ark-red-500 scale-110 shadow-md" : "border-transparent hover:border-[#D0D0D0]",
                    )}
                  >
                    <img src={url} alt={seed} className="size-14 bg-[#F5F5F5]" />
                    {isActive ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Check className="size-5 text-white" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 border-t border-[#F0F0F0] pt-4 dark:border-[#2A3444]">
              <button
                type="button"
                onClick={() => { setShowAvatarPicker(false); avatarInputRef.current?.click(); }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E6E6E6] bg-[#F9F9F9] py-2.5 text-[14px] font-medium text-[#1E1E1E] transition-colors hover:bg-[#F0F0F0] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:text-[#EAEBEC] dark:hover:bg-[#2F3744]"
              >
                <Camera className="size-4" />
                Upload from computer
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAvatarPicker(false)}
              className="mt-3 w-full rounded-xl py-2 text-[13px] text-[#919191] hover:text-[#555]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  // ── Section renderer ────────────────────────────────────────────────────────

  function renderSection() {
    switch (activeTab) {
      case "profile": return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E0E0E0] bg-white p-5 dark:border-[#2A3444] dark:bg-[#141C27]">
            <h2 className="font-display text-[22px] text-[#1E1E1E] dark:text-white">Profile</h2>
            <p className="mt-1 text-[13px] text-[#919191] dark:text-[#BFC1C5]">
              How you appear to your team and in requests.
            </p>

            {/* Avatar */}
            <div className="mt-5 flex items-center gap-4">
              <div className="relative">
                <div className="size-20 overflow-hidden rounded-full border-2 border-[#E6E6E6] bg-[#F5F5F5] dark:border-[#2F3744]">
                  {avatarUploading ? (
                    <div className="flex size-full items-center justify-center bg-[#F5F5F5]">
                      <Loader2 className="size-6 animate-spin text-[#B0B0B0]" />
                    </div>
                  ) : (
                    <img src={avatarSrc} alt="Your avatar" className="size-full object-cover" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(true)}
                  className="absolute -bottom-1 -right-1 grid size-7 cursor-pointer place-items-center rounded-full border border-[#E6E6E6] bg-white text-[#4A4A4A] shadow-sm transition-colors hover:bg-[#F6F6F6] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:text-[#EAEBEC]"
                  aria-label="Change avatar"
                >
                  <Camera className="size-3.5" />
                </button>
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#1E1E1E] dark:text-[#EAEBEC]">
                  {profile.display_name ?? profile.full_name ?? user?.email?.split("@")[0] ?? "You"}
                </p>
                <p className="text-[13px] text-[#919191] dark:text-[#BFC1C5]">{user?.email}</p>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(true)}
                  className="mt-1 text-[12px] font-medium text-ark-red-500 hover:underline"
                >
                  Change photo
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full Name" hint="Your legal or preferred name">
                  <Input
                    value={profile.full_name ?? ""}
                    onChange={(e) => updateProfile({ full_name: e.target.value || null })}
                    placeholder="Jane Smith"
                    className="h-10 rounded-full border-[#CFCFD2] text-[14px]"
                  />
                </Field>
                <Field label="Display Name" hint="Shown in comments and activity">
                  <Input
                    value={profile.display_name ?? ""}
                    onChange={(e) => updateProfile({ display_name: e.target.value || null })}
                    placeholder="Jane"
                    className="h-10 rounded-full border-[#CFCFD2] text-[14px]"
                  />
                </Field>
              </div>

              <Field label="Email" hint="To change your email contact support">
                <Input
                  value={user?.email ?? ""}
                  readOnly
                  className="h-10 rounded-full border-[#CFCFD2] bg-[#F9F9F9] text-[14px] text-[#919191] cursor-not-allowed dark:bg-[#1A1E25]"
                />
              </Field>

              <Field label="Bio" hint="A short intro, up to 300 characters">
                <textarea
                  value={profile.bio ?? ""}
                  onChange={(e) => updateProfile({ bio: e.target.value.slice(0, 300) || null })}
                  placeholder="Tell your team a bit about yourself..."
                  className="h-[90px] w-full resize-none rounded-2xl border border-[#CFCFD2] bg-white px-3 py-2.5 text-[14px] leading-relaxed outline-none placeholder:text-[#C4C4C7] focus:border-[#2F3744] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:text-[#EAEBEC]"
                />
                <p className="mt-1 text-right text-[11px] text-[#C4C4C7]">{(profile.bio ?? "").length}/300</p>
              </Field>
            </div>

            {profileError ? (
              <p className="mt-3 text-[13px] text-ark-red-500">{profileError}</p>
            ) : null}

            <div className="mt-5 flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                className="h-[38px] cursor-pointer rounded-full px-6"
                onClick={() => void saveProfile()}
                disabled={!profileDirty || profileSaving}
              >
                {profileSaving ? <Loader2 className="size-4 animate-spin" /> : profileSaved ? "Saved ✓" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      );

      case "account": return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E0E0E0] bg-white p-5 dark:border-[#2A3444] dark:bg-[#141C27]">
            <h2 className="font-display text-[22px] text-[#1E1E1E] dark:text-white">Account</h2>
            <p className="mt-1 text-[13px] text-[#919191] dark:text-[#BFC1C5]">
              Security and access settings for your account.
            </p>

            <div className="mt-5 divide-y divide-[#F0F0F0] dark:divide-[#2A3444]">
              <div className="pb-4">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#919191]">Email</p>
                <p className="mt-1 text-[15px] font-medium text-[#1E1E1E] dark:text-[#EAEBEC]">
                  {user?.email}
                </p>
                <p className="mt-0.5 text-[12px] text-[#919191]">
                  Contact support to change your email address.
                </p>
              </div>

              <div className="py-4">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#919191]">Password</p>
                <p className="mt-1 text-[13px] text-[#616161] dark:text-[#BFC1C5]">
                  Change your password regularly to keep your account secure.
                </p>
                <Button
                  className="mt-3 h-9 cursor-pointer rounded-full bg-[#2F3744] px-5 text-[13px] text-white hover:bg-[#2F3744]/90 dark:bg-[#2B323E]"
                  onClick={() => router.push("/auth/change-password")}
                >
                  Change Password
                </Button>
              </div>

              <div className="py-4">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#919191]">Session</p>
                <p className="mt-1 text-[13px] text-[#616161] dark:text-[#BFC1C5]">
                  Sign out from this device.
                </p>
                <Button
                  variant="outline"
                  className="mt-3 flex h-9 cursor-pointer items-center gap-2 rounded-full border-[#E6E6E6] px-5 text-[13px]"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/");
                  }}
                >
                  <LogOut className="size-3.5" />
                  Sign Out
                </Button>
              </div>

              <div className="pt-4">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#919191]">App Role</p>
                <p className="mt-1 text-[13px] text-[#616161] dark:text-[#BFC1C5]">
                  Your role in the ARKHV platform.
                </p>
                <span className="mt-2 inline-flex rounded-full border border-[#2F3744] bg-[rgba(47,55,68,0.08)] px-3 py-1 text-[13px] font-medium text-[#2F3744] dark:border-[#9FA3A9] dark:text-[#9FA3A9]">
                  {appRole ?? "client"}
                </span>
              </div>
            </div>
          </div>
        </div>
      );

      case "notifications": return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E0E0E0] bg-white p-5 dark:border-[#2A3444] dark:bg-[#141C27]">
            <h2 className="font-display text-[22px] text-[#1E1E1E] dark:text-white">Notifications</h2>
            <p className="mt-1 text-[13px] text-[#919191] dark:text-[#BFC1C5]">
              Choose what you get notified about and how.
            </p>

            <div className="mt-5">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#919191]">Email Notifications</p>
              <ToggleRow
                label="Request status updates"
                hint="When your request moves to In Progress, needs review, etc."
                checked={notifPrefs.email_request_update}
                onChange={(v) => setNotifPrefs((p) => ({ ...p, email_request_update: v }))}
              />
              <ToggleRow
                label="Request completed"
                hint="When a request is marked Done and deliverables are ready"
                checked={notifPrefs.email_request_completed}
                onChange={(v) => setNotifPrefs((p) => ({ ...p, email_request_completed: v }))}
              />
              <ToggleRow
                label="New messages"
                hint="When someone replies to a request you're part of"
                checked={notifPrefs.email_new_message}
                onChange={(v) => setNotifPrefs((p) => ({ ...p, email_new_message: v }))}
              />
              <ToggleRow
                label="Team & workspace"
                hint="New team member added, seat changes, plan upgrades"
                checked={notifPrefs.email_team_invite}
                onChange={(v) => setNotifPrefs((p) => ({ ...p, email_team_invite: v }))}
              />
            </div>

            <div className="mt-5">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#919191]">In-App</p>
              <ToggleRow
                label="All in-app notifications"
                hint="Bell icon badge and notification feed inside the dashboard"
                checked={notifPrefs.inapp_all}
                onChange={(v) => setNotifPrefs((p) => ({ ...p, inapp_all: v }))}
              />
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                className="h-[38px] cursor-pointer rounded-full px-6"
                onClick={() => void saveNotifications()}
                disabled={notifSaving}
              >
                {notifSaving ? <Loader2 className="size-4 animate-spin" /> : notifSaved ? "Saved ✓" : "Save Preferences"}
              </Button>
            </div>
          </div>
        </div>
      );

      case "subscription": return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E0E0E0] bg-white p-5 dark:border-[#2A3444] dark:bg-[#141C27]">
            <h2 className="font-display text-[22px] text-[#1E1E1E] dark:text-white">Subscription</h2>
            <p className="mt-1 text-[13px] text-[#919191] dark:text-[#BFC1C5]">
              Your current plan and usage limits.
            </p>

            <div className="mt-5">
              {planCfg ? (
                <div className="rounded-xl border border-[#EBEBEB] bg-[#FAFAFA] p-4 dark:border-[#2F3744] dark:bg-[#1A1E25]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[18px] font-semibold text-[#1E1E1E] dark:text-white">{planCfg.display_name}</p>
                    <span className="rounded-full bg-[rgba(16,203,41,0.12)] px-2.5 py-0.5 text-[12px] font-medium text-[#10CB29]">
                      Active
                    </span>
                  </div>
                  <p className="mt-1 text-[22px] font-medium text-ark-red-500">
                    {formatPlanPrice(planCfg.price_monthly_usd)}
                    <span className="text-[14px] font-normal text-[#919191]"> / month</span>
                  </p>
                  <ul className="mt-3 space-y-1">
                    {[
                      requestLimitLabel(planCfg),
                      `${planCfg.max_active_requests} active request${planCfg.max_active_requests !== 1 ? "s" : ""} at a time`,
                      `${planCfg.max_seats} team seat${planCfg.max_seats !== 1 ? "s" : ""}`,
                      `${planCfg.storage_label} storage`,
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-[13px] text-[#616161] dark:text-[#BFC1C5]">
                        <Check className="size-3.5 shrink-0 text-[#10CB29]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-[14px] text-[#919191]">No active subscription found.</p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                className="h-9 cursor-pointer rounded-full bg-[#2F3744] px-5 text-[13px] text-white hover:bg-[#2F3744]/90 dark:bg-[#2B323E]"
                onClick={() => router.push("/subscription")}
              >
                View Full Details
              </Button>
              {billingPortalUrl ? (
                <Button
                  variant="outline"
                  className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border-[#E6E6E6] px-5 text-[13px]"
                  onClick={() => window.location.assign(billingPortalUrl)}
                >
                  Manage Billing <ExternalLink className="size-3" />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E0E0E0] bg-white p-5 dark:border-[#2A3444] dark:bg-[#141C27]">
            <h3 className="font-display text-[18px] text-[#1E1E1E] dark:text-white">Cancel Subscription</h3>
            <p className="mt-2 text-[13px] text-[#616161] dark:text-[#BFC1C5]">
              Cancelling will end access to ARKHV features at the end of your current billing period.
              Your data and brand assets will remain accessible for 30 days after cancellation.
            </p>
            {billingPortalUrl ? (
              <Button
                variant="outline"
                className="mt-4 h-9 cursor-pointer rounded-full border-ark-red-500 px-5 text-[13px] text-ark-red-500 hover:bg-[rgba(255,0,0,0.04)]"
                onClick={() => window.location.assign(billingPortalUrl)}
              >
                Cancel Subscription
              </Button>
            ) : (
              <p className="mt-3 text-[12px] text-[#919191]">
                Contact support to cancel your subscription.
              </p>
            )}
          </div>
        </div>
      );

      case "danger": return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[rgba(255,0,0,0.25)] bg-white p-5 dark:border-[rgba(255,0,0,0.2)] dark:bg-[#141C27]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-ark-red-500" />
              <h2 className="font-display text-[22px] text-ark-red-500">Danger Zone</h2>
            </div>
            <p className="mt-1 text-[13px] text-[#919191] dark:text-[#BFC1C5]">
              These actions are permanent and cannot be undone.
            </p>

            <div className="mt-5 rounded-xl border border-[rgba(255,0,0,0.2)] bg-[rgba(255,0,0,0.03)] p-4">
              <p className="text-[15px] font-semibold text-[#1E1E1E] dark:text-white">Delete Account</p>
              <p className="mt-1 text-[13px] text-[#616161] dark:text-[#BFC1C5]">
                Permanently deletes your account, all submitted requests, and removes you from your team.
                This action cannot be reversed.
              </p>

              <div className="mt-4 space-y-3">
                <Field label={`Type "${user?.email}" to confirm`}>
                  <Input
                    value={deleteEmail}
                    onChange={(e) => setDeleteEmail(e.target.value)}
                    placeholder={user?.email ?? "your@email.com"}
                    className="h-10 rounded-full border-[#CFCFD2] text-[14px]"
                  />
                </Field>
                <Button
                  className="h-9 cursor-pointer rounded-full bg-ark-red-500 px-5 text-[13px] font-medium text-white hover:bg-ark-red-500/90 disabled:opacity-40"
                  disabled={deleteEmail !== user?.email || deleteConfirming}
                  onClick={() => void handleDeleteAccount()}
                >
                  {deleteConfirming ? <Loader2 className="size-4 animate-spin" /> : "Delete My Account"}
                </Button>
                {deleteError ? (
                  <p className="text-[13px] text-ark-red-500">{deleteError}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      );

      default: return null;
    }
  }
}
