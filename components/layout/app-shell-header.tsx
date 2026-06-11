"use client"

/* eslint-disable @next/next/no-img-element -- Dicebear avatar */

import {
  Bell,
  Moon,
  Search,
  Sun,
  Settings,
  User,
  LogOut,
  FileText,
  RefreshCw,
  MessageSquare,
  CheckCheck,
  Trash2,
  Loader2,
} from "lucide-react"
import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

// ── Notification types ────────────────────────────────────────────────────────

type NotifRow = {
  id: string
  type: string
  request_id: string | null
  title: string
  body: string | null
  read_at: string | null
  created_at: string
}

function notifIcon(type: string) {
  if (type === "status_changed") return <RefreshCw className="size-3.5 text-[#508CF0]" />
  if (type === "comment_added") return <MessageSquare className="size-3.5 text-[#9B59B6]" />
  return <FileText className="size-3.5 text-[#10CB29]" />
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export type AppShellHeaderSearch = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export type AppShellHeaderProps = {
  title: React.ReactNode
  /** Optional row above title (e.g. mobile-only) */
  topRow?: React.ReactNode
  leadingSlot?: React.ReactNode
  search?: AppShellHeaderSearch | null
  showSubmitTask?: boolean
  onSubmitTask?: () => void
  submitTaskLabel?: string
  unreadCount: number
  userEmail?: string
  /** Extra controls after the search field (e.g. “Update payment”) */
  toolbarExtras?: React.ReactNode
  className?: string
}

export function AppShellHeader({
  title,
  topRow,
  leadingSlot,
  search,
  showSubmitTask,
  onSubmitTask,
  submitTaskLabel = "Submit Request",
  unreadCount,
  userEmail = "user",
  toolbarExtras,
  className,
}: AppShellHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const isDark = mounted && resolvedTheme === "dark"

  // Avatar menu
  const [avatarMenuOpen, setAvatarMenuOpen] = React.useState(false)
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null)
  const avatarMenuRef = React.useRef<HTMLDivElement>(null)

  // Notification panel
  const [notifOpen, setNotifOpen] = React.useState(false)
  const [notifs, setNotifs] = React.useState<NotifRow[]>([])
  const [notifsLoading, setNotifsLoading] = React.useState(false)
  const [localUnread, setLocalUnread] = React.useState(unreadCount)
  const notifRef = React.useRef<HTMLDivElement>(null)

  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  // Keep badge in sync when parent refreshes the count
  React.useEffect(() => { setLocalUnread(unreadCount) }, [unreadCount])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Load custom avatar if set
  React.useEffect(() => {
    void fetch("/api/profile")
      .then((r) => r.json())
      .then((j: { data?: { avatar_url?: string | null } }) => {
        if (j?.data?.avatar_url) setAvatarUrl(j.data.avatar_url)
      })
      .catch(() => {})
  }, [])

  // Fetch notifications when panel opens
  React.useEffect(() => {
    if (!notifOpen) return
    setNotifsLoading(true)
    void fetch("/api/notifications?limit=10")
      .then((r) => r.json())
      .then((j: { data?: NotifRow[]; unread_count?: number }) => {
        setNotifs(j.data ?? [])
        if (typeof j.unread_count === "number") setLocalUnread(j.unread_count)
      })
      .catch(() => {})
      .finally(() => setNotifsLoading(false))
  }, [notifOpen])

  // Close notification panel on outside click
  React.useEffect(() => {
    if (!notifOpen) return
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [notifOpen])

  // Close avatar menu on outside click
  React.useEffect(() => {
    if (!avatarMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [avatarMenuOpen])

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mark_all_read: true }),
    })
    setNotifs((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    setLocalUnread(0)
  }

  async function markOneRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    })
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    setLocalUnread((c) => Math.max(0, c - 1))
  }

  async function clearAll() {
    await fetch("/api/notifications", { method: "DELETE" })
    setNotifs([])
    setLocalUnread(0)
  }

  return (
    <header
      className={cn(
        "rounded-2xl border border-[#E0E0E0] bg-white px-3 py-3 lg:min-h-[62px] lg:px-5 lg:py-2.5 dark:border-[#2A3444] dark:bg-[#141C27]",
        className
      )}
    >
      {topRow}
      <div
        className={cn(
          "flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4",
          topRow ? "mt-3 lg:mt-0" : ""
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-[min(100%,380px)] lg:shrink-0">
          {leadingSlot}
          <div className="min-w-0 font-display text-[18px] leading-tight text-[#1E1E1E] sm:text-[20px] dark:text-white">
            {title}
          </div>
        </div>

        {search ? (
          <div className="relative w-full min-w-0 flex-[1.2] lg:max-w-md xl:max-w-[364px]">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-[#949494] dark:text-[#9FA3A9]" />
            <Input
              id={search.id}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? "Search…"}
              className="h-[42px] min-h-[42px] w-full rounded-full border-[#E6E6E6] bg-[#F6F6F6] pr-11 pl-4 text-[14px] dark:border-[#2F3744] dark:bg-[#1A1E25]"
            />
          </div>
        ) : (
          <div className="hidden lg:block lg:flex-1" />
        )}

        {toolbarExtras ? (
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:shrink-0">
            {toolbarExtras}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:shrink-0 lg:gap-3">
          {showSubmitTask ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-[42px] cursor-pointer rounded-full border-ark-red-500 px-[18px] text-ark-red-500 shadow-[0px_8px_14px_0px_rgba(255,0,0,0.1)]"
              onClick={onSubmitTask}
            >
              {submitTaskLabel}
            </Button>
          ) : null}
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="hidden size-[42px] cursor-pointer place-items-center rounded-full border border-[#E6E6E6] bg-[#F6F6F6] text-[#4A4A4A] transition-colors hover:bg-[#ECECEC] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:text-[#EAEBEC] dark:hover:bg-[#2F3744] sm:grid"
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <div ref={notifRef} className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => { setNotifOpen((o) => !o); setAvatarMenuOpen(false) }}
              className={cn(
                "grid size-[42px] cursor-pointer place-items-center rounded-full border border-[#E6E6E6] bg-[#F6F6F6] text-[#4A4A4A] transition-colors hover:bg-[#ECECEC] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:text-[#EAEBEC] dark:hover:bg-[#2F3744]",
                notifOpen && "bg-[#ECECEC] dark:bg-[#2F3744]",
              )}
              aria-label="Notifications"
            >
              <Bell className="size-5" />
            </button>

            {localUnread > 0 ? (
              <span className="pointer-events-none absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-ark-red-500 px-1 text-[10px] font-semibold leading-[10px] text-white">
                {localUnread > 99 ? "99+" : localUnread}
              </span>
            ) : null}

            {notifOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] overflow-hidden rounded-2xl border border-[#E0E0E0] bg-white shadow-[0px_8px_32px_rgba(0,0,0,0.12)] dark:border-[#2A3444] dark:bg-[#141C27]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#F0F0F0] px-4 py-3 dark:border-[#2A3444]">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-semibold text-[#1E1E1E] dark:text-white">Notifications</p>
                    {localUnread > 0 ? (
                      <span className="grid min-w-5 place-items-center rounded-full bg-ark-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {localUnread}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    {localUnread > 0 ? (
                      <button
                        type="button"
                        onClick={() => void markAllRead()}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-[#555] transition-colors hover:bg-[#F5F5F5] dark:text-[#BFC1C5] dark:hover:bg-[#1A1E25]"
                        title="Mark all as read"
                      >
                        <CheckCheck className="size-3.5" />
                        Mark read
                      </button>
                    ) : null}
                    {notifs.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => void clearAll()}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-ark-red-500 transition-colors hover:bg-[rgba(255,0,0,0.05)]"
                        title="Clear all notifications"
                      >
                        <Trash2 className="size-3.5" />
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* List */}
                <div className="max-h-[380px] overflow-y-auto">
                  {notifsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="size-5 animate-spin text-[#B0B0B0]" />
                    </div>
                  ) : notifs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                      <Bell className="size-7 text-[#D0D0D0]" />
                      <p className="text-[13px] text-[#919191]">No notifications yet</p>
                    </div>
                  ) : (
                    <ul>
                      {notifs.map((n) => {
                        const isUnread = !n.read_at
                        return (
                          <li key={n.id}>
                            <button
                              type="button"
                              className={cn(
                                "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F9F9F9] dark:hover:bg-[#1A1E25]",
                                isUnread && "bg-[rgba(255,0,0,0.02)]",
                              )}
                              onClick={() => {
                                if (isUnread) void markOneRead(n.id)
                                if (n.request_id) {
                                  setNotifOpen(false)
                                  router.push(`/requests/${n.request_id}/activity`)
                                }
                              }}
                            >
                              {/* Type icon */}
                              <div className={cn(
                                "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                                isUnread ? "bg-[#F0F4FF] dark:bg-[#1A2233]" : "bg-[#F5F5F5] dark:bg-[#1A1E25]",
                              )}>
                                {notifIcon(n.type)}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className={cn(
                                  "truncate text-[13px] leading-snug",
                                  isUnread
                                    ? "font-semibold text-[#1E1E1E] dark:text-white"
                                    : "font-medium text-[#555] dark:text-[#BFC1C5]",
                                )}>
                                  {n.title}
                                </p>
                                {n.body ? (
                                  <p className="mt-0.5 line-clamp-2 text-[12px] text-[#919191] dark:text-[#747982]">
                                    {n.body}
                                  </p>
                                ) : null}
                                <p className="mt-1 text-[11px] text-[#B0B0B0] dark:text-[#4A5060]">
                                  {timeAgo(n.created_at)}
                                </p>
                              </div>

                              {isUnread ? (
                                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ark-red-500" />
                              ) : null}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-[#F0F0F0] px-4 py-2.5 dark:border-[#2A3444]">
                  <Link
                    href="/settings?tab=notifications"
                    className="block text-center text-[12px] font-medium text-[#919191] transition-colors hover:text-ark-red-500 dark:text-[#747982] dark:hover:text-ark-red-500"
                    onClick={() => setNotifOpen(false)}
                  >
                    Notification preferences →
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
          <div ref={avatarMenuRef} className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setAvatarMenuOpen((o) => !o)}
              className="block size-[42px] cursor-pointer overflow-hidden rounded-full border border-[#E6E6E6] transition-opacity hover:opacity-80 dark:border-[#2F3744]"
              aria-label="Open profile menu"
            >
              <img
                src={avatarUrl ?? `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(userEmail)}`}
                alt=""
                className="size-full"
              />
            </button>

            {avatarMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[220px] overflow-hidden rounded-2xl border border-[#E0E0E0] bg-white shadow-[0px_8px_24px_rgba(0,0,0,0.1)] dark:border-[#2A3444] dark:bg-[#141C27]">
                {/* User info */}
                <div className="flex items-center gap-3 border-b border-[#F0F0F0] px-4 py-3 dark:border-[#2A3444]">
                  <div className="size-9 shrink-0 overflow-hidden rounded-full border border-[#E6E6E6] dark:border-[#2F3744]">
                    <img
                      src={avatarUrl ?? `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(userEmail)}`}
                      alt=""
                      className="size-full"
                    />
                  </div>
                  <p className="min-w-0 truncate text-[13px] font-medium text-[#1E1E1E] dark:text-[#EAEBEC]">
                    {userEmail}
                  </p>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => { setAvatarMenuOpen(false); router.push("/settings") }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-[#1E1E1E] transition-colors hover:bg-[#F6F6F6] dark:text-[#EAEBEC] dark:hover:bg-[#1A1E25]"
                  >
                    <User className="size-4 shrink-0 text-[#919191]" />
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAvatarMenuOpen(false); router.push("/settings?tab=account") }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-[#1E1E1E] transition-colors hover:bg-[#F6F6F6] dark:text-[#EAEBEC] dark:hover:bg-[#1A1E25]"
                  >
                    <Settings className="size-4 shrink-0 text-[#919191]" />
                    Settings
                  </button>
                </div>

                <div className="border-t border-[#F0F0F0] py-1 dark:border-[#2A3444]">
                  <button
                    type="button"
                    onClick={async () => {
                      setAvatarMenuOpen(false)
                      await supabase.auth.signOut()
                      router.push("/")
                      router.refresh()
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-ark-red-500 transition-colors hover:bg-[rgba(255,0,0,0.05)]"
                  >
                    <LogOut className="size-4 shrink-0" />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
