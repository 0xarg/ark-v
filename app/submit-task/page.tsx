"use client";

import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  AppPageLoader,
  RequestLimitReachedModal,
  AppShellHeader,
  AppSidebar,
  MobileNavChips,
  SubscriptionSidebarCard,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet, apiGetRaw, apiPost } from "@/lib/http/request";
import { putFileToSignedUrl } from "@/lib/uploads/put-signed-url";
import { createClient } from "@/lib/supabase/client";
import { useTeamSidebarSubscription } from "@/hooks/use-team-sidebar-subscription";
import { navItemsForRole } from "@/lib/navigation/app-nav";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, Sparkles } from "lucide-react";
import {
  BrandAssetPicker,
  type PickedAsset,
} from "@/components/submit/brand-asset-picker";

type Priority = "Low" | "Medium" | "High";
type RequestType =
  | "Apparel & Merchandise"
  | "Brand & Identity"
  | "Corporate & Internal"
  | "Digital & Web"
  | "Environmental & Event"
  | "eBooks & Digital Report"
  | "Illustration & Artwork"
  | "Marketing & Advertising"
  | "Motion Graphics"
  | "Presentations"
  | "Print"
  | "Product & Packaging";

const REQUEST_TYPES: RequestType[] = [
  "Apparel & Merchandise",
  "Brand & Identity",
  "Corporate & Internal",
  "Digital & Web",
  "Environmental & Event",
  "eBooks & Digital Report",
  "Illustration & Artwork",
  "Marketing & Advertising",
  "Motion Graphics",
  "Presentations",
  "Print",
  "Product & Packaging",
];
type DeadlineType = "standard" | "priority" | "specific";

function deadlineToIso(type: DeadlineType, specificDate: string): string | null {
  if (type === "specific" && specificDate) {
    // Parse as local date at noon to avoid UTC-offset flips
    return new Date(specificDate + "T12:00:00").toISOString();
  }
  return null;
}

const DRAFT_KEY = "arkhv_submit_draft_v1";

type DraftData = {
  title: string;
  requestType: RequestType;
  priority: Priority;
  description: string;
  useAI: boolean;
  deadlineType: DeadlineType;
  specificDate: string;
  kickoffCall: boolean;
  savedAt: number;
};

function loadDraft(): DraftData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DraftData;
  } catch {
    return null;
  }
}

function saveDraft(data: Omit<DraftData, "savedAt">): void {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...data, savedAt: Date.now() }),
    );
  } catch {
    /* storage full or unavailable — silently ignore */
  }
}

function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function formatDraftAge(savedAt: number): string {
  const mins = Math.floor((Date.now() - savedAt) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
type SubmitView = "step1" | "step2" | "success";
type UploadStatus = "queued" | "uploading" | "uploaded" | "failed";

type UploadItem = {
  id: string;
  file: File;
  name: string;
  sizeBytes: number;
  sizeLabel: string;
  previewUrl: string | null;
  progress: number;
  status: UploadStatus;
  error: string | null;
  uploadedUrl: string | null;
  objectKey: string | null;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/zip",
  "application/octet-stream",
]);

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10}KB`;
  return `${Math.round(bytes / (1024 * 102.4)) / 10}MB`;
}

const SUCCESS_ILLUSTRATION = "/waitlist/success-icon.svg";

export default function SubmitRequestPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [view, setView] = React.useState<SubmitView>("step1");
  const [title, setTitle] = React.useState("Landing Hero Section Design");
  const [requestType, setRequestType] =
    React.useState<RequestType>("Brand & Identity");
  const [priority, setPriority] = React.useState<Priority>("Medium");
  const [description, setDescription] = React.useState("");
  const [useAI, setUseAI] = React.useState(false);

  const [deadlineType, setDeadlineType] = React.useState<DeadlineType>("standard");
  const [specificDate, setSpecificDate] = React.useState("");
  const [skipApproval, setSkipApproval] = React.useState(true);
  const [kickoffCall, setKickoffCall] = React.useState(false);
  const [draftRestoredAt, setDraftRestoredAt] = React.useState<number | null>(null);
  const [draftSavedAt, setDraftSavedAt] = React.useState<number | null>(null);
  const [files, setFiles] = React.useState<UploadItem[]>([]);
  const [pickedAssets, setPickedAssets] = React.useState<PickedAsset[]>([]);
  const [showBrandPicker, setShowBrandPicker] = React.useState(false);
  const [fileErrors, setFileErrors] = React.useState<string[]>([]);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [showValidationError, setShowValidationError] = React.useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] =
    React.useState(0);

  // AI enhance state
  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const [originalDescription, setOriginalDescription] = React.useState<
    string | null
  >(null);
  const [aiError, setAiError] = React.useState<string | null>(null);

  const handleEnhance = React.useCallback(async () => {
    if (isEnhancing || description.trim().length < 5) return;
    setIsEnhancing(true);
    setAiError(null);
    setOriginalDescription(description);
    try {
      const res = await fetch("/api/ai/enhanced-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = (await res.json()) as { enhanced?: string; error?: string };
      if (!res.ok || data.error) {
        setAiError(data.error ?? "Failed to enhance. Please try again.");
        setOriginalDescription(null);
        return;
      }
      if (data.enhanced) {
        setDescription(data.enhanced);
      }
    } catch {
      setAiError("Failed to enhance. Please try again.");
      setOriginalDescription(null);
    } finally {
      setIsEnhancing(false);
    }
  }, [description, isEnhancing]);

  const navItems = React.useMemo(() => navItemsForRole("client"), []);
  const sidebarSub = useTeamSidebarSubscription(supabase, user?.id);

  React.useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.push("/auth");
        return;
      }
      const me = await apiGet<{ app_role?: string }>("/api/me");
      const appRole = me.app_role;
      if (appRole !== "client") {
        router.replace("/dashboard");
        return;
      }
      setUser(data.user);
      setLoading(false);
    };
    void getUser();
  }, [router, supabase]);

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

  React.useEffect(() => {
    return () => {
      files.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [files]);

  // Restore draft on first mount
  React.useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;
    setTitle(draft.title);
    setRequestType(draft.requestType);
    setPriority(draft.priority);
    setDescription(draft.description);
    setUseAI(draft.useAI);
    setDeadlineType(draft.deadlineType);
    setSpecificDate(draft.specificDate);
    setKickoffCall(draft.kickoffCall);
    setDraftRestoredAt(draft.savedAt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft whenever form fields change (skip on success view)
  React.useEffect(() => {
    if (view === "success") return;
    const id = setTimeout(() => {
      saveDraft({
        title,
        requestType,
        priority,
        description,
        useAI,
        deadlineType,
        specificDate,
        kickoffCall,
      });
    }, 600);
    return () => clearTimeout(id);
  }, [title, requestType, priority, description, useAI, deadlineType, specificDate, kickoffCall, view]);

  const selectFiles = React.useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const nextErrors: string[] = [];
    const nextItems: UploadItem[] = [];
    Array.from(selectedFiles).forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const isFig = ext === "fig";
      if (!isFig && !ALLOWED_FILE_TYPES.has(file.type)) {
        nextErrors.push(`${file.name}: file type is not supported`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        nextErrors.push(`${file.name}: file exceeds 25MB`);
        return;
      }
      const previewUrl = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null;
      nextItems.push({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        sizeBytes: file.size,
        sizeLabel: formatFileSize(file.size),
        previewUrl,
        progress: 0,
        status: "queued",
        error: null,
        uploadedUrl: null,
        objectKey: null,
      });
    });
    if (nextErrors.length > 0) {
      setFileErrors(nextErrors);
    } else {
      setFileErrors([]);
    }
    if (nextItems.length > 0) {
      setFiles((prev) => [...prev, ...nextItems]);
    }
  }, []);

  const removeFile = React.useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const getTeamId = React.useCallback(async () => {
    if (!user) throw new Error("User not loaded");
    const { data, error } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (error) {
      return;
    }
    if (!data?.team_id) {
      return null;
    }
    return data.team_id as string;
  }, [supabase, user]);

  const descriptionCount = description.length;
  const titleInvalid = title.trim().length === 0;
  const descriptionInvalid = description.trim().length < 20;
  const step1Invalid = titleInvalid || descriptionInvalid;
  const showStep1Errors = showValidationError && view === "step1";
  const isLimitReached =
    sidebarSub.maxActiveRequests > 0 &&
    sidebarSub.activeConcurrency >= sidebarSub.maxActiveRequests;

  if (loading || sidebarSub.loading) {
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
            title="Submit New Request"
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
            showSubmitTask={false}
            unreadCount={unreadNotificationCount}
            userEmail={user?.email ?? "user"}
          />

          <section className="rounded-2xl border border-[#E0E0E0] bg-white p-3 dark:border-[#2A3444] dark:bg-[#141C27] md:p-4">
            {view !== "success" ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-[24px] text-[#1E1E1E] dark:text-white">
                      New Request
                    </h2>
                    <p className="text-[14px] text-[#919191] dark:text-[#BFC1C5]">
                      Provide clear details to help our team deliver faster.
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <span
                      className={cn(
                        "h-2 w-6 rounded-full",
                        view === "step1" ? "bg-ark-red-500" : "bg-ark-red-500",
                      )}
                    />
                    <span
                      className={cn(
                        "h-2 w-6 rounded-full",
                        view === "step2" ? "bg-ark-red-500" : "bg-[#D2D2D2]",
                      )}
                    />
                  </div>
                </div>

                {draftRestoredAt ? (
                  <div className="flex items-center justify-between rounded-xl border border-[#F0E68C] bg-[#FFFDE7] px-4 py-2.5 dark:border-[#4A4320] dark:bg-[#2A2810]">
                    <p className="text-[13px] text-[#7A6800] dark:text-[#D4B800]">
                      Draft restored from {formatDraftAge(draftRestoredAt)}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setTitle("");
                        setDescription("");
                        setRequestType("Brand & Identity");
                        setPriority("Medium");
                        setUseAI(false);
                        setDeadlineType("standard");
                        setSpecificDate("");
                        setKickoffCall(false);
                        setDraftRestoredAt(null);
                        clearDraft();
                      }}
                      className="ml-4 shrink-0 text-[12px] font-medium text-[#7A6800] underline underline-offset-2 hover:text-[#5A4D00] dark:text-[#D4B800] dark:hover:text-[#F0D800]"
                    >
                      Discard draft
                    </button>
                  </div>
                ) : null}

                {view === "step1" ? (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-1 text-[12px] font-semibold text-[#5A5A60]">
                        Request Title *
                      </p>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Request Title..."
                        className={cn(
                          "h-[40px] min-h-[40px] rounded-full border px-3 py-2 text-[14px]",
                          showStep1Errors && titleInvalid
                            ? "border-[#CE3426] text-[#CE3426]"
                            : "border-[#CFCFD2]",
                        )}
                      />
                      <p
                        className={cn(
                          "mt-1 text-[12px]",
                          showStep1Errors && titleInvalid
                            ? "text-[#CE3426]"
                            : "text-[#5A5A60]",
                        )}
                      >
                        {showStep1Errors && titleInvalid
                          ? "Request title is required."
                          : "Keep it short and specific."}
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="mb-1 text-[12px] font-semibold text-[#5A5A60]">
                          Request Type *
                        </p>
                        <div className="relative">
                          <select
                            value={requestType}
                            onChange={(e) =>
                              setRequestType(e.target.value as RequestType)
                            }
                            className="h-[40px] w-full cursor-pointer appearance-none rounded-full border border-[#CFCFD2] bg-white px-3 text-[14px] text-[#252527] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:text-[#EAEBEC]"
                          >
                            {REQUEST_TYPES.map((item) => (
                              <option key={item}>{item}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-current" />
                        </div>
                      </div>

                      <div>
                        <p className="mb-1 text-[12px] font-semibold text-[#5A5A60]">
                          Priority
                        </p>
                        <div className="flex h-[40px] items-center gap-5">
                          {(["Low", "Medium", "High"] as const).map((item) => (
                            <label
                              key={item}
                              className="flex items-center gap-2 text-[14px]"
                            >
                              <input
                                type="radio"
                                name="priority"
                                checked={priority === item}
                                onChange={() => setPriority(item)}
                                className="h-4 w-4 accent-red-500"
                              />
                              {item}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 text-[12px] font-semibold text-[#5A5A60]">
                        Task Description *
                      </p>

                      {/*
                       * Textarea box.
                       * Enhanced state: border darkens to ark-blue-500 + subtle inset
                       * shadow — no color glow, stays on-theme.
                       * transition targets only border-color + box-shadow (not `all`).
                       */}
                      <div
                        className={cn(
                          "rounded-[20px] border bg-white p-3 dark:bg-[#1A1E25]",
                          "[transition:border-color_160ms_cubic-bezier(0.23,1,0.32,1),box-shadow_160ms_cubic-bezier(0.23,1,0.32,1)]",
                          originalDescription !== null && !isEnhancing
                            ? "border-[#2F3744] shadow-[0px_0px_0px_3px_rgba(47,55,68,0.08)] dark:border-[#9FA3A9] dark:shadow-[0px_0px_0px_3px_rgba(159,163,169,0.1)]"
                            : showStep1Errors && descriptionInvalid
                              ? "border-ark-red-500"
                              : "border-[#CFCFD2] dark:border-[#2F3744]",
                        )}
                      >
                        {/* State 2 — badge enters from slightly above (scale 0.95, not 0) */}
                        {isEnhancing ? (
                          <div className="ai-enter mb-2 inline-flex items-center gap-2 rounded-full border border-[#E4E4E7] bg-[#FAFAFA] px-3 py-[5px] dark:border-[#2F3744] dark:bg-[#1E2330]">
                            {/* Fast-spinning ring — perceived speed matches actual AI speed */}
                            <span
                              className="ai-spinner inline-block h-3 w-3 rounded-full border-[1.5px] border-[#CFCFD2] border-t-[#252527] dark:border-[#3A4050] dark:border-t-[#9FA3A9]"
                              aria-hidden
                            />
                            <span className="text-[12px] font-medium text-[#5A5A60] dark:text-[#9FA3A9]">
                              Improving description...
                            </span>
                          </div>
                        ) : null}

                        <textarea
                          value={description}
                          disabled={isEnhancing}
                          onChange={(e) => {
                            setDescription(e.target.value.slice(0, 1000));
                            if (originalDescription !== null)
                              setOriginalDescription(null);
                          }}
                          placeholder="Describe your requirements, goals, references, and any important details."
                          className={cn(
                            "h-[112px] w-full resize-none border-0 bg-transparent p-0 text-[14px] leading-relaxed outline-none placeholder:text-[#C4C4C7] dark:placeholder:text-[#3A4050]",
                            "[transition:opacity_160ms_cubic-bezier(0.23,1,0.32,1)]",
                            isEnhancing && "opacity-30",
                          )}
                        />
                        <p className="text-right text-[12px] text-[#BFBFC2] dark:text-[#3A4050]">
                          {descriptionCount} / 1000
                        </p>
                      </div>

                      {/* Action row */}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {/*
                           * "Improve with AI" — dark pill matching the app's secondary
                           * button color. Precise transition properties (not `all`).
                           * active:scale(0.97) gives press feedback instantly.
                           */}
                          <button
                            type="button"
                            onClick={() => void handleEnhance()}
                            disabled={
                              isEnhancing || description.trim().length < 5
                            }
                            className={cn(
                              "inline-flex items-center gap-[7px] rounded-full px-4 py-[7px] text-[13px] font-medium leading-none",
                              "[transition:background-color_160ms_cubic-bezier(0.23,1,0.32,1),box-shadow_160ms_cubic-bezier(0.23,1,0.32,1),transform_120ms_cubic-bezier(0.23,1,0.32,1),opacity_160ms_cubic-bezier(0.23,1,0.32,1)]",
                              isEnhancing || description.trim().length < 5
                                ? "cursor-not-allowed bg-[#F4F4F5] text-[#BFBFC2] dark:bg-[#1E2330] dark:text-[#3A4050]"
                                : "cursor-pointer bg-[#252527] text-white shadow-[0px_1px_3px_rgba(0,0,0,0.12),0px_4px_12px_rgba(0,0,0,0.08)] hover:bg-[#1A1A1C] hover:shadow-[0px_2px_6px_rgba(0,0,0,0.16),0px_6px_16px_rgba(0,0,0,0.1)] active:scale-[0.97] dark:bg-[#2F3744] dark:hover:bg-[#262D3A]",
                            )}
                          >
                            <Sparkles
                              className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                isEnhancing || description.trim().length < 5
                                  ? "text-[#BFBFC2] dark:text-[#3A4050]"
                                  : "text-white",
                              )}
                            />
                            Improve with AI
                          </button>

                          {aiError ? (
                            <p className="text-[12px] text-ark-red-500">
                              {aiError}
                            </p>
                          ) : null}
                        </div>

                        {/*
                         * Revert / Apply appear together via ai-enter.
                         * Apply = app's primary button (red outline) — consistent
                         * with Continue / Submit elsewhere in the form.
                         */}
                        {!isEnhancing && originalDescription !== null ? (
                          <div className="ai-enter flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setDescription(originalDescription);
                                setOriginalDescription(null);
                              }}
                              className="inline-flex h-[34px] cursor-pointer items-center rounded-full bg-[#F4F4F5] px-5 text-[13px] font-medium text-[#252527] [transition:background-color_120ms_cubic-bezier(0.23,1,0.32,1),transform_120ms_cubic-bezier(0.23,1,0.32,1)] hover:bg-[#ECECED] active:scale-[0.97] dark:bg-[#2F3744] dark:text-[#EAEBEC] dark:hover:bg-[#262D3A]"
                            >
                              Revert
                            </button>
                            <button
                              type="button"
                              onClick={() => setOriginalDescription(null)}
                              className="inline-flex h-[34px] cursor-pointer items-center rounded-full border border-ark-red-500 bg-transparent px-5 text-[13px] font-medium text-ark-red-500 [transition:background-color_120ms_cubic-bezier(0.23,1,0.32,1),transform_120ms_cubic-bezier(0.23,1,0.32,1)] hover:bg-[rgba(255,0,0,0.04)] active:scale-[0.97]"
                            >
                              Apply
                            </button>
                          </div>
                        ) : null}
                      </div>

                      {showStep1Errors && descriptionInvalid ? (
                        <p className="mt-1 text-[12px] text-ark-red-500">
                          Please provide at least 20 characters.
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <p className="mb-2 text-[12px] font-semibold text-[#5A5A60]">
                        Creative Exploration
                      </p>
                      <div className="flex items-center justify-between rounded-[20px] border border-[#CFCFD2] p-4 dark:border-[#2F3744]">
                        <div>
                          <p className="text-[15px] font-semibold text-[#1E1E1E] dark:text-white">
                            Use of AI tools?
                          </p>
                          <p className="mt-0.5 text-[13px] text-[#919191] dark:text-[#BFC1C5]">
                            Speeds up design time with AI
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={useAI}
                          onClick={() => setUseAI((v) => !v)}
                          className={cn(
                            "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors duration-200",
                            useAI ? "bg-ark-red-500" : "bg-[#3A3F4A]",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                              useAI ? "translate-x-6" : "translate-x-1",
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-1 text-[12px] font-semibold text-[#5A5A60]">
                        File Link Input
                      </p>
                      <div className="rounded-[20px] border border-[#E6E6E6] bg-[#F6F6F6] p-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            selectFiles(e.target.files);
                            e.currentTarget.value = "";
                          }}
                        />
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            type="button"
                            className="h-[42px] cursor-pointer rounded-[10px] border border-[#E6E6E6] bg-white px-6 text-[14px] font-medium transition-colors hover:bg-[#FAFAFA]"
                          >
                            Upload from your computer
                          </button>
                          <button
                            onClick={() => setShowBrandPicker(true)}
                            type="button"
                            className="h-[42px] cursor-pointer rounded-[10px] border border-[#E6E6E6] bg-white px-6 text-[14px] font-medium transition-colors hover:bg-[#FAFAFA]"
                          >
                            Upload from File Assets
                            {pickedAssets.length > 0 ? (
                              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ark-red-500 px-1.5 text-[11px] font-medium text-white">
                                {pickedAssets.length}
                              </span>
                            ) : null}
                          </button>
                        </div>
                        {fileErrors.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {fileErrors.map((err) => (
                              <p
                                key={err}
                                className="text-[12px] text-[#CE3426]"
                              >
                                {err}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="flex h-[90px] items-center gap-3 rounded-[20px] border border-[#E6E6E6] bg-white p-2"
                        >
                          <div className="h-[74px] w-[74px] overflow-hidden rounded-xl bg-[#F2F2F2]">
                            {file.previewUrl ? (
                              <img
                                src={file.previewUrl}
                                alt={file.name}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="flex-1">
                            <p className="text-[16px] font-medium">
                              {file.name}
                            </p>
                            <p className="text-[12px] text-[#919191]">
                              {file.sizeLabel}
                            </p>
                            <p className="text-[11px] text-[#757575]">
                              {file.status === "uploading"
                                ? `Uploading ${file.progress}%`
                                : file.status === "uploaded"
                                  ? "Uploaded"
                                  : file.status === "failed"
                                    ? (file.error ?? "Upload failed")
                                    : "Ready to upload"}
                            </p>
                            {file.status === "uploading" ? (
                              <div className="mt-1 h-1.5 w-full rounded bg-[#EFEFEF]">
                                <div
                                  className="h-1.5 rounded bg-ark-red-500 transition-all"
                                  style={{ width: `${file.progress}%` }}
                                />
                              </div>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-ark-red-500 text-ark-red-500 transition-colors hover:bg-[rgba(255,0,0,0.06)]"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Picked brand assets */}
                    {pickedAssets.length > 0 ? (
                      <div>
                        <p className="mb-2 text-[12px] font-semibold text-[#5A5A60]">
                          From Brand Asset Library
                        </p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {pickedAssets.map((asset) => (
                            <div
                              key={asset.id}
                              className="flex items-center gap-3 rounded-[20px] border border-[#E6E6E6] bg-white p-3"
                            >
                              <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#ECECEC] bg-[#F5F5F5]">
                                {/\.(png|jpe?g|gif|webp|svg)$/i.test(asset.name) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={asset.file_url}
                                    alt=""
                                    className="size-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[10px] font-medium uppercase text-[#919191]">
                                    {asset.name.split(".").pop()?.slice(0, 4) ?? "file"}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-medium text-[#1E1E1E]">
                                  {asset.name}
                                </p>
                                <p className="text-[12px] text-[#919191]">
                                  {asset.size_label} · From library
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setPickedAssets((prev) =>
                                    prev.filter((a) => a.id !== asset.id),
                                  )
                                }
                                className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-ark-red-500 text-ark-red-500 transition-colors hover:bg-[rgba(255,0,0,0.06)]"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <p className="mb-2 text-[12px] font-semibold text-[#5A5A60]">
                        Preferred Deadline
                      </p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {(
                          [
                            {
                              id: "standard" as DeadlineType,
                              label: "Standard",
                              hint: "Regular turnaround, no rush",
                            },
                            {
                              id: "priority" as DeadlineType,
                              label: "Priority",
                              hint: "Expedited, best effort",
                            },
                            {
                              id: "specific" as DeadlineType,
                              label: "Specific Date",
                              hint: "Pick an exact date",
                            },
                          ] as const
                        ).map(({ id, label, hint }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setDeadlineType(id)}
                            className={cn(
                              "rounded-[20px] border p-4 text-left transition-colors",
                              deadlineType === id
                                ? "border-ark-red-500 bg-[rgba(255,0,0,0.04)]"
                                : "border-[#CFCFD2] hover:bg-[#FAFAFA] dark:border-[#2F3744] dark:hover:bg-[#1A1E25]",
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p
                                  className={cn(
                                    "text-[15px] font-semibold",
                                    deadlineType === id
                                      ? "text-ark-red-500"
                                      : "text-[#1E1E1E] dark:text-white",
                                  )}
                                >
                                  {label}
                                </p>
                                <p className="mt-0.5 text-[12px] text-[#919191] dark:text-[#BFC1C5]">
                                  {hint}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "mt-0.5 block h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                                  deadlineType === id
                                    ? "border-ark-red-500 bg-ark-red-500"
                                    : "border-[#D0D0D0] dark:border-[#3A4050]",
                                )}
                              />
                            </div>
                          </button>
                        ))}
                      </div>

                      {deadlineType === "specific" ? (
                        <div className="mt-3">
                          <input
                            type="date"
                            value={specificDate}
                            min={new Date().toISOString().split("T")[0]}
                            onChange={(e) => setSpecificDate(e.target.value)}
                            className="h-[40px] w-full cursor-pointer rounded-full border border-[#CFCFD2] bg-white px-4 text-[14px] text-[#1E1E1E] outline-none focus:border-ark-red-500 dark:border-[#2F3744] dark:bg-[#1A1E25] dark:text-[#EAEBEC]"
                          />
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => setKickoffCall((prev) => !prev)}
                        className="cursor-pointer rounded-[20px] border  p-5 text-left transition-colors "
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-display text-[24px] leading-none">
                              Kickoff call
                            </p>
                            <p className="mt-1 text-[14px] text-[#919191]">
                              Yes, I would like a kickoff call
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={kickoffCall}
                            readOnly
                            className="mt-1 h-4 w-4 accent-red-500"
                          />
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setTitle("");
                      setDescription("");
                      setView("step1");
                      setShowValidationError(false);
                      setPickedAssets([]);
                      setFiles([]);
                      setDeadlineType("standard");
                      setSpecificDate("");
                      setKickoffCall(false);
                      setUseAI(false);
                      setDraftRestoredAt(null);
                      setDraftSavedAt(null);
                      clearDraft();
                    }}
                    className="h-[42px] cursor-pointer rounded-full bg-[#F6F6F6] px-8 text-[16px] font-medium text-black transition-colors hover:bg-[#ECECEC]"
                  >
                    Discard
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        saveDraft({
                          title,
                          requestType,
                          priority,
                          description,
                          useAI,
                          deadlineType,
                          specificDate,
                          kickoffCall,
                        });
                        setDraftSavedAt(Date.now());
                      }}
                      className="h-[42px] cursor-pointer rounded-full bg-[#F6F6F6] px-8 text-[16px] font-medium text-black transition-colors hover:bg-[#ECECEC]"
                    >
                      {draftSavedAt ? "Draft Saved ✓" : "Save Draft"}
                    </button>
                    {view === "step1" ? (
                      <Button
                        disabled={submitting}
                        onClick={() => {
                          if (step1Invalid) {
                            setShowValidationError(true);
                            return;
                          }
                          setShowValidationError(false);
                          setView("step2");
                        }}
                        size="sm"
                        className="h-[42px] w-[120px] px-0"
                      >
                        Continue
                      </Button>
                    ) : (
                      <Button
                        disabled={submitting}
                        onClick={async () => {
                          setSubmitting(true);
                          setSubmitError(null);
                          try {
                            // create a team on first time request

                            let teamId = await getTeamId();
                            if (!teamId) {
                              const team = await apiPost<{ id?: string }>(
                                "/api/teams",
                                { name: "Default Team" },
                              );
                              if (!team?.id)
                                throw new Error("Failed to create team");
                              teamId = team.id;
                            }
                            const created = await apiPost<{ id?: string }>(
                              "/api/requests",
                              {
                                team_id: teamId,
                                title: title.trim(),
                                description: description.trim(),
                                status: "submitted",
                                priority: priority.toLowerCase(),
                                deadline: deadlineToIso(deadlineType, specificDate),
                                request_type: requestType,
                                use_ai: useAI,
                                kickoff_call: kickoffCall,
                              },
                            );
                            if (!created?.id)
                              throw new Error("Failed to create request");
                            const requestId = created.id;

                            for (const item of files) {
                              setFiles((prev) =>
                                prev.map((row) =>
                                  row.id === item.id
                                    ? {
                                        ...row,
                                        status: "uploading",
                                        progress: 0,
                                        error: null,
                                      }
                                    : row,
                                ),
                              );

                              try {
                                const signed = await apiPost<{
                                  upload_url?: string;
                                  object_key?: string;
                                }>("/api/files/upload-url", {
                                  request_id: requestId,
                                  file_name: item.file.name,
                                  content_type:
                                    item.file.type ||
                                    "application/octet-stream",
                                });
                                if (!signed?.upload_url) {
                                  throw new Error("Failed to prepare upload");
                                }

                                await putFileToSignedUrl({
                                  uploadUrl: signed.upload_url,
                                  file: item.file,
                                  onProgress: (progress) => {
                                    setFiles((prev) =>
                                      prev.map((row) =>
                                        row.id === item.id
                                          ? { ...row, progress }
                                          : row,
                                      ),
                                    );
                                  },
                                });

                                await apiPost(
                                  `/api/requests/${requestId}/deliverables`,
                                  {
                                    object_key: signed.object_key,
                                  },
                                );

                                setFiles((prev) =>
                                  prev.map((row) =>
                                    row.id === item.id
                                      ? {
                                          ...row,
                                          status: "uploaded",
                                          progress: 100,
                                          objectKey: signed?.object_key ?? null,
                                        }
                                      : row,
                                  ),
                                );
                              } catch (uploadError) {
                                const message =
                                  uploadError instanceof Error
                                    ? uploadError.message
                                    : "Upload failed";
                                setFiles((prev) =>
                                  prev.map((row) =>
                                    row.id === item.id
                                      ? {
                                          ...row,
                                          status: "failed",
                                          error: message,
                                        }
                                      : row,
                                  ),
                                );
                                throw uploadError;
                              }
                            }

                            // Link brand assets — already in R2, no upload needed
                            for (const asset of pickedAssets) {
                              await apiPost(
                                `/api/requests/${requestId}/deliverables`,
                                { file_url: asset.file_url },
                              );
                            }

                            clearDraft();
                            setView("success");
                          } catch (error) {
                            const message =
                              error instanceof Error
                                ? error.message
                                : "Failed to submit request";
                            setSubmitError(message);
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                        size="sm"
                        className="h-[42px] w-[120px] px-0"
                      >
                        {submitting ? "Submitting..." : "Submit Brief"}
                      </Button>
                    )}
                  </div>
                </div>
                {submitError ? (
                  <p className="mt-3 text-[13px] text-[#CE3426]">
                    {submitError}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="grid min-h-[720px] place-items-center">
                <div className="text-center">
                  <img
                    src={SUCCESS_ILLUSTRATION}
                    alt="Request submitted successfully"
                    className="mx-auto mb-8 h-[188px] w-[209px] object-contain"
                  />
                  <h2 className="font-display text-[54px] leading-none text-[#1E1E1E]">
                    Request Submitted Successfully
                  </h2>
                  <p className="mt-3 text-[18px] leading-6 text-[#919191]">
                    Your request has been sent to our team.
                    <br />
                    You can track its progress in your dashboard.
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setView("step1");
                        setTitle("");
                        setDescription("");
                        setShowValidationError(false);
                      }}
                      className="h-[42px] cursor-pointer rounded-full bg-[#F6F6F6] px-7 text-[16px] font-medium transition-colors hover:bg-[#ECECEC]"
                    >
                      Submit Another Request
                    </button>

                    <Button
                      type="button"
                      onClick={() => router.push("/dashboard")}
                      size="sm"
                      variant="primary"
                    >
                      View Request
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {isLimitReached ? (
        <RequestLimitReachedModal
          maxActiveRequests={sidebarSub.maxActiveRequests}
          onClose={() => router.push("/dashboard")}
          onUpgradePlan={() => router.push("/subscription")}
          onViewActiveRequests={() => router.push("/dashboard")}
        />
      ) : null}

      {showBrandPicker && user ? (
        <BrandAssetPicker
          supabase={supabase}
          userId={user.id}
          initialSelected={pickedAssets}
          onClose={() => setShowBrandPicker(false)}
          onConfirm={(assets) => {
            setPickedAssets(assets);
            setShowBrandPicker(false);
          }}
        />
      ) : null}
    </div>
  );
}
