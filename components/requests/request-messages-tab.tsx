"use client"

/* eslint-disable @next/next/no-img-element */

import type { ActivityFeedEntry } from "@/lib/api/activity-feed"
import { formatStatusLabel } from "@/lib/api/activity-feed"
import type { ActivityActionType } from "@/lib/api/activity"
import { apiGet, apiPost } from "@/lib/http/request"
import { putFileToSignedUrl } from "@/lib/uploads/put-signed-url"
import {
  avatarUrl,
  buildThread,
  capitalizeWord,
  formatFeedTimestamp,
  formatLongDate,
  type CommentRow,
} from "@/components/requests/request-messages-tab/thread-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Dialog } from "radix-ui"
import {
  BarChart3,
  ChevronDown,
  Image as ImageIcon,
  Paperclip,
  Search,
  Send,
  Smile,
  Type,
  X,
} from "lucide-react"
import * as React from "react"

const MAX_FILE_SIZE = 25 * 1024 * 1024
const ALLOWED_FILE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/zip",
  "application/octet-stream",
])

const TIMELINE_ACTIONS: ActivityActionType[] = [
  "request_created",
  "status_changed",
  "request_assigned",
]

const MESSAGE_FILTER_OPTIONS: Array<{ value: "all" | "comments" | "files"; label: string }> = [
  { value: "all", label: "All" },
  { value: "comments", label: "Comments" },
  { value: "files", label: "Files" },
]

const QUICK_EMOJIS = ["👍", "❤️", "😊", "🎉", "✅", "🙏", "👀", "🔥", "💡", "✨"] as const

function insertInTextarea(
  textarea: HTMLTextAreaElement | null,
  current: string,
  snippet: string,
  setValue: (v: string) => void
) {
  if (!textarea) {
    setValue(current + snippet)
    return
  }
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const next = current.slice(0, start) + snippet + current.slice(end)
  setValue(next)
  requestAnimationFrame(() => {
    textarea.focus()
    const pos = start + snippet.length
    textarea.setSelectionRange(pos, pos)
  })
}

function wrapSelectionMarkdown(
  textarea: HTMLTextAreaElement | null,
  current: string,
  wrap: string,
  setValue: (v: string) => void
) {
  if (!textarea) {
    setValue(`${current}${wrap}text${wrap}`)
    return
  }
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const sel = current.slice(start, end)
  const inner = sel.length > 0 ? sel : "text"
  const snippet = `${wrap}${inner}${wrap}`
  const next = current.slice(0, start) + snippet + current.slice(end)
  setValue(next)
  requestAnimationFrame(() => {
    textarea.focus()
    const pos = start + snippet.length
    textarea.setSelectionRange(pos, pos)
  })
}

type RequestDetail = {
  id: string
  title: string
  description: string | null
  status: string | null
  priority: string | null
  deadline: string | null
  created_at: string | null
  created_by: string | null
  assigned_creative: string | null
  requester_display: string
  assignee_display: string | null
}

type FileRow = {
  id: string
  file_url: string
  name: string
  version: number
  uploaded_by: string
  created_at: string | null
  size_label: string
}

export type RequestMessagesTabProps = {
  requestId: string
  activityEntries: ActivityFeedEntry[]
  onRefreshActivity: () => void
}

export function RequestMessagesTab({
  requestId,
  activityEntries,
  onRefreshActivity,
}: RequestMessagesTabProps) {
  const [detail, setDetail] = React.useState<RequestDetail | null>(null)
  const [detailLoading, setDetailLoading] = React.useState(true)
  const [comments, setComments] = React.useState<CommentRow[]>([])
  const [commentsLoading, setCommentsLoading] = React.useState(true)
  const [files, setFiles] = React.useState<FileRow[]>([])
  const [filesLoading, setFilesLoading] = React.useState(true)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [messageDraft, setMessageDraft] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [fileSideTab, setFileSideTab] = React.useState<"client" | "deliverables">("client")
  const [threadSearch, setThreadSearch] = React.useState("")
  const [messageFilter, setMessageFilter] = React.useState<"all" | "comments" | "files">("all")
  const [filterOpen, setFilterOpen] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const imageInputRef = React.useRef<HTMLInputElement | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
  const composerToolsRef = React.useRef<HTMLDivElement | null>(null)
  const threadEndRef = React.useRef<HTMLDivElement | null>(null)
  const [emojiOpen, setEmojiOpen] = React.useState(false)
  const [formatOpen, setFormatOpen] = React.useState(false)

  const loadDetail = React.useCallback(async () => {
    setDetailLoading(true)
    try {
      const data = await apiGet<RequestDetail>(`/api/requests/${requestId}/detail`)
      setDetail(data ?? null)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [requestId])

  const loadComments = React.useCallback(async () => {
    setCommentsLoading(true)
    try {
      const data = await apiGet<CommentRow[]>(`/api/requests/${requestId}/comments`)
      setComments(data ?? [])
    } catch {
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }, [requestId])

  const loadFiles = React.useCallback(async () => {
    setFilesLoading(true)
    try {
      const data = await apiGet<FileRow[]>(`/api/requests/${requestId}/files`)
      setFiles(data ?? [])
    } catch {
      setFiles([])
    } finally {
      setFilesLoading(false)
    }
  }, [requestId])

  React.useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  React.useEffect(() => {
    void loadComments()
  }, [loadComments])

  React.useEffect(() => {
    void loadFiles()
  }, [loadFiles])

  React.useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments, activityEntries])

  React.useEffect(() => {
    if (!emojiOpen && !formatOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const el = composerToolsRef.current
      if (el && e.target instanceof Node && el.contains(e.target)) return
      setEmojiOpen(false)
      setFormatOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [emojiOpen, formatOpen])

  const createdById = detail?.created_by ?? null

  const clientFiles = React.useMemo(() => {
    if (!createdById) return files
    return files.filter((f) => f.uploaded_by === createdById)
  }, [files, createdById])

  const deliverableFiles = React.useMemo(() => {
    if (!createdById) return []
    return files.filter((f) => f.uploaded_by !== createdById)
  }, [files, createdById])

  const sidebarFiles = fileSideTab === "client" ? clientFiles : deliverableFiles

  const timelineEntries = React.useMemo(() => {
    return [...activityEntries]
      .filter((e) => TIMELINE_ACTIONS.includes(e.actionType as ActivityActionType))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [activityEntries])

  const mergedThread = React.useMemo(
    () => buildThread(comments, activityEntries),
    [comments, activityEntries]
  )

  const filteredThread = React.useMemo(() => {
    const q = threadSearch.trim().toLowerCase()
    return mergedThread.filter((item) => {
      if (messageFilter === "comments" && item.kind !== "comment") return false
      if (messageFilter === "files" && item.kind !== "file_activity") return false
      if (q.length === 0) return true
      if (item.kind === "comment") {
        return (
          item.comment.message.toLowerCase().includes(q) ||
          item.comment.display_name.toLowerCase().includes(q)
        )
      }
      return (
        item.display_name.toLowerCase().includes(q) ||
        item.files.some((f) => f.name.toLowerCase().includes(q))
      )
    })
  }, [mergedThread, threadSearch, messageFilter])

  const filterLabel =
    MESSAGE_FILTER_OPTIONS.find((o) => o.value === messageFilter)?.label ?? "All"

  const descriptionPreview = detail?.description?.trim() ?? ""
  const truncatedDescription =
    descriptionPreview.length > 220
      ? `${descriptionPreview.slice(0, 220).trim()}…`
      : descriptionPreview

  const sendMessage = async () => {
    const text = messageDraft.trim()
    if (!text || sending) return
    setEmojiOpen(false)
    setFormatOpen(false)
    setSending(true)
    try {
        await apiPost(`/api/requests/${requestId}/comments`, { message: text })
        setMessageDraft("")
        await loadComments()
        onRefreshActivity()
    } catch {
      /* toast optional */
    } finally {
      setSending(false)
    }
  }

  const onPickFiles = async (list: FileList | null) => {
    if (!list?.length || uploading) return
    setUploading(true)
    try {
      for (const file of Array.from(list)) {
        const ext = file.name.split(".").pop()?.toLowerCase()
        const isFig = ext === "fig"
        if (!isFig && !ALLOWED_FILE_TYPES.has(file.type)) continue
        if (file.size > MAX_FILE_SIZE) continue

        const signData = await apiPost<{
          upload_url?: string
          object_key?: string
          version?: number
        }>("/api/files/upload-url", {
          request_id: requestId,
          file_name: file.name,
          content_type: file.type || "application/octet-stream",
        })
        if (!signData?.upload_url) throw new Error("Could not prepare upload")

        await putFileToSignedUrl({ uploadUrl: signData.upload_url, file })

        await apiPost(`/api/requests/${requestId}/deliverables`, {
          object_key: signData.object_key,
          version: signData.version,
        })
      }
      await loadFiles()
      onRefreshActivity()
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const statusLabel = formatStatusLabel(detail?.status ?? null)
  const priorityLabel = capitalizeWord(detail?.priority ?? null)

  return (
    <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="relative min-w-[200px] flex-1 sm:max-w-md">
            <Input
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              placeholder="Search…"
              className="h-[42px] min-h-[42px] rounded-full border-[#E6E6E6] bg-[#F6F6F6] px-5 pr-11 text-[14px]"
            />
            <Search className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-[#1E1E1E]" />
          </div>
          <div className="flex h-[42px] items-center gap-2 rounded-full border border-ark-dark-blue-grey bg-white pl-3 pr-2">
            <BarChart3 className="size-5 shrink-0 text-[#1E1E1E]" />
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((o) => !o)}
                className="flex min-w-[100px] cursor-pointer items-center justify-between gap-2 text-[14px] font-medium text-black"
              >
                {filterLabel}
                <ChevronDown className="size-4" />
              </button>
              {filterOpen ? (
                <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-[#E0E0E0] bg-white py-1 shadow-lg">
                  {MESSAGE_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className="flex w-full cursor-pointer px-3 py-2 text-left text-[13px] hover:bg-[#F6F6F6]"
                      onClick={() => {
                        setMessageFilter(opt.value)
                        setFilterOpen(false)
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-[20px] bg-[#F6F6F6] p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-display text-lg text-[#1E1E1E]">Request details</p>
            <button
              type="button"
              onClick={() => setDetailOpen(true)}
              className="cursor-pointer text-[14px] font-semibold text-ark-brand-red hover:underline"
            >
              View
            </button>
          </div>
          {detailLoading ? (
            <p className="mt-2 text-[14px] text-[#666]">Loading…</p>
          ) : (
            <>
              {descriptionPreview ? (
                <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-[#3B3B3B]">
                  {truncatedDescription}
                </p>
              ) : (
                <p className="mt-3 text-[14px] text-[#919191]">No description provided.</p>
              )}
              <div className="mt-4 grid gap-2 border-t border-[#E6E6E6] pt-4 text-[14px]">
                <p className="text-[#919191]">
                  Requested by:{" "}
                  <span className="font-medium text-[#1E1E1E]">
                    {detail?.requester_display ?? "—"}
                  </span>
                </p>
                <p className="text-[#919191]">
                  Priority:{" "}
                  <span className="font-medium text-[#1E1E1E]">{priorityLabel}</span>
                </p>
              </div>
            </>
          )}
        </div>

        <div className="rounded-[20px] border border-[#E0E0E0] bg-white p-3 md:p-4">
          <div className="max-h-[420px] overflow-y-auto pr-1 [scrollbar-width:thin]">
            {commentsLoading ? (
              <p className="py-8 text-center text-[14px] text-[#666]">Loading messages…</p>
            ) : filteredThread.length === 0 ? (
              <p className="py-8 text-center text-[14px] text-[#666]">No messages yet.</p>
            ) : (
              <ul className="space-y-4">
                {filteredThread.map((item) => {
                  if (item.kind === "file_activity") {
                    const fromClient =
                      createdById != null && item.actor_id === createdById
                    const alignFileRight = !fromClient
                    return (
                      <li
                        key={`f-${item.id}`}
                        className={cn("flex gap-3", alignFileRight ? "flex-row-reverse" : "")}
                      >
                        <img
                          src={avatarUrl(item.actor_id)}
                          alt=""
                          className="size-10 shrink-0 rounded-full"
                        />
                        <div
                          className={cn(
                            "min-w-0 max-w-[85%]",
                            alignFileRight && "flex flex-col items-end"
                          )}
                        >
                          <p className="text-[12px] text-[#919191]">
                            {item.display_name}
                            <span className="text-[#C8C8C8]"> · </span>
                            {item.role_label}
                          </p>
                          <div className="mt-1 space-y-2">
                            {item.files.map((f) => (
                              <div
                                key={`${item.id}-${f.name}`}
                                className="flex max-w-full items-center gap-3 rounded-2xl border border-[#E6E6E6] bg-white px-3 py-2 shadow-sm"
                              >
                                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#FFE4E4]">
                                  <Paperclip className="size-5 text-ark-brand-red" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-[14px] font-medium text-[#1E1E1E]">
                                    {f.name}
                                  </p>
                                  <p className="text-[12px] text-[#919191]">
                                    {formatFeedTimestamp(item.created_at)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </li>
                    )
                  }

                  const c = item.comment
                  const isClientMessage = createdById != null && c.user_id === createdById
                  const alignRight = !isClientMessage

                  return (
                    <li
                      key={c.id}
                      className={cn("flex gap-3", alignRight ? "flex-row-reverse" : "")}
                    >
                      <img
                        src={avatarUrl(c.user_id)}
                        alt=""
                        className="size-10 shrink-0 rounded-full"
                      />
                      <div
                        className={cn(
                          "min-w-0 max-w-[85%]",
                          alignRight && "flex flex-col items-end"
                        )}
                      >
                        <p className="text-[12px] text-[#919191]">
                          {c.display_name}
                          <span className="text-[#C8C8C8]"> · </span>
                          {isClientMessage ? "Client" : "Team"}
                        </p>
                        <div
                          className={cn(
                            "mt-1 rounded-2xl px-4 py-3 shadow-sm",
                            alignRight
                              ? "rounded-tr-sm bg-ark-brand-red text-white"
                              : "rounded-tl-sm bg-[#ECECEC] text-[#1E1E1E]"
                          )}
                        >
                          <p className="whitespace-pre-wrap text-[14px] leading-relaxed">
                            {c.message}
                          </p>
                          <p
                            className={cn(
                              "mt-2 text-right text-[11px] opacity-80",
                              alignRight ? "text-white" : "text-[#666]"
                            )}
                          >
                            {formatFeedTimestamp(c.created_at)}
                          </p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <div ref={threadEndRef} />
          </div>

          <div className="relative mt-4 rounded-2xl border border-[#E6E6E6] bg-[#FAFAFA] p-3">
            <textarea
              ref={textareaRef}
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void sendMessage()
                }
              }}
              placeholder={"Type '/' to use template message"}
              rows={3}
              className="w-full resize-none bg-transparent text-[14px] text-[#1E1E1E] outline-none placeholder:text-[#919191]"
            />
            <div
              ref={composerToolsRef}
              className="relative mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#ECECEC] pt-3"
            >
              <div className="flex items-center gap-2 text-[#666]">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => void onPickFiles(e.target.files)}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  multiple
                  className="hidden"
                  onChange={(e) => void onPickFiles(e.target.files)}
                />
                <button
                  type="button"
                  disabled={uploading}
                  className="grid size-9 cursor-pointer place-items-center rounded-full border border-transparent hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="size-5" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Insert emoji"
                    aria-expanded={emojiOpen}
                    className="grid size-9 cursor-pointer place-items-center rounded-full border border-transparent hover:bg-white"
                    onClick={() => {
                      setFormatOpen(false)
                      setEmojiOpen((o) => !o)
                    }}
                  >
                    <Smile className="size-5" />
                  </button>
                  {emojiOpen ? (
                    <div
                      className="absolute bottom-full left-0 z-30 mb-2 flex max-w-[240px] flex-wrap gap-0.5 rounded-xl border border-[#E0E0E0] bg-white p-2 shadow-lg"
                      role="listbox"
                      aria-label="Quick emoji"
                    >
                      {QUICK_EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          className="grid size-9 cursor-pointer place-items-center rounded-lg text-lg hover:bg-[#F6F6F6]"
                          onClick={() => {
                            insertInTextarea(
                              textareaRef.current,
                              messageDraft,
                              em,
                              setMessageDraft
                            )
                            setEmojiOpen(false)
                          }}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={uploading}
                  className="grid size-9 cursor-pointer place-items-center rounded-full border border-transparent hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Attach image"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageIcon className="size-5" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Text formatting"
                    aria-expanded={formatOpen}
                    className="grid size-9 cursor-pointer place-items-center rounded-full border border-transparent hover:bg-white"
                    onClick={() => {
                      setEmojiOpen(false)
                      setFormatOpen((o) => !o)
                    }}
                  >
                    <Type className="size-5" />
                  </button>
                  {formatOpen ? (
                    <div className="absolute bottom-full left-0 z-30 mb-2 min-w-[168px] overflow-hidden rounded-xl border border-[#E0E0E0] bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        className="flex w-full cursor-pointer px-3 py-2 text-left text-[13px] hover:bg-[#F6F6F6]"
                        onClick={() => {
                          wrapSelectionMarkdown(
                            textareaRef.current,
                            messageDraft,
                            "**",
                            setMessageDraft
                          )
                          setFormatOpen(false)
                        }}
                      >
                        Bold (**text**)
                      </button>
                      <button
                        type="button"
                        className="flex w-full cursor-pointer px-3 py-2 text-left text-[13px] hover:bg-[#F6F6F6]"
                        onClick={() => {
                          wrapSelectionMarkdown(
                            textareaRef.current,
                            messageDraft,
                            "_",
                            setMessageDraft
                          )
                          setFormatOpen(false)
                        }}
                      >
                        Italic (_text_)
                      </button>
                      <button
                        type="button"
                        className="flex w-full cursor-pointer px-3 py-2 text-left text-[13px] hover:bg-[#F6F6F6]"
                        onClick={() => {
                          insertInTextarea(
                            textareaRef.current,
                            messageDraft,
                            "\n- ",
                            setMessageDraft
                          )
                          setFormatOpen(false)
                        }}
                      >
                        Bullet list
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                disabled={sending || !messageDraft.trim()}
                onClick={() => void sendMessage()}
                className="h-10 gap-2 rounded-full bg-ark-brand-red px-5 font-display text-[14px] text-white shadow-[0px_8px_14px_0px_rgba(255,0,0,0.2)] hover:bg-ark-brand-red/90"
              >
                <Send className="size-4" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>

      <aside className="w-full shrink-0 space-y-4 lg:w-[300px]">
        <div className="rounded-[20px] border border-[#E0E0E0] bg-white p-4 shadow-[0px_8px_24px_rgba(0,0,0,0.04)]">
          <p className="font-display text-lg text-[#1E1E1E]">Status</p>
          <div className="mt-3 rounded-2xl bg-[#F6F6F6] p-3">
            <p className="text-[14px] font-medium text-[#1E1E1E]">
              {detail?.title ?? "—"}
            </p>
            <span
              className={cn(
                "mt-2 inline-flex rounded-full border px-3 py-1 text-[12px] font-medium",
                (detail?.status ?? "").toLowerCase().includes("progress")
                  ? "border-amber-400 text-amber-700"
                  : "border-[#DDD] text-[#666]"
              )}
            >
              {statusLabel || "—"}
            </span>
            <div className="mt-3 space-y-1 text-[13px] text-[#666]">
              <p>
                Priority:{" "}
                <span className="font-medium text-[#1E1E1E]">{priorityLabel}</span>
              </p>
              <p>
                Submitted:{" "}
                <span className="font-medium text-[#1E1E1E]">
                  {formatLongDate(detail?.created_at)}
                </span>
              </p>
              {detail?.assignee_display ? (
                <p>
                  Assignee:{" "}
                  <span className="font-medium text-[#1E1E1E]">
                    {detail.assignee_display}
                  </span>
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-4 border-t border-[#ECECEC] pt-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#919191]">
              Timeline
            </p>
            <ul className="relative mt-3 space-y-4 pl-4">
              <div className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-[#E0E0E0]" />
              {timelineEntries.length === 0 ? (
                <li className="text-[13px] text-[#919191]">No status events yet.</li>
              ) : (
                timelineEntries.map((e) => (
                  <li key={e.id} className="relative pl-3">
                    <span className="absolute left-[-5px] top-1.5 size-2 rounded-full bg-ark-brand-red" />
                    <p className="text-[12px] text-[#919191]">
                      {formatFeedTimestamp(e.timestamp)}
                    </p>
                    <p className="text-[13px] font-medium text-[#3B3B3B]">{e.primaryText}</p>
                    {e.secondaryText ? (
                      <p className="text-[12px] text-[#919191]">{e.secondaryText}</p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="rounded-[20px] border border-[#E0E0E0] bg-white p-4 shadow-[0px_8px_24px_rgba(0,0,0,0.04)]">
          <p className="font-display text-lg text-[#1E1E1E]">Files</p>
          <div className="mt-3 inline-flex h-10 w-full rounded-full border border-[#DDD] bg-[#F6F6F6] p-1">
            <button
              type="button"
              className={cn(
                "flex-1 cursor-pointer rounded-full text-[13px] font-medium transition-colors",
                fileSideTab === "client"
                  ? "bg-ark-brand-red text-white shadow-[0px_4px_12px_rgba(255,0,0,0.25)]"
                  : "text-[#666] hover:bg-white/60"
              )}
              onClick={() => setFileSideTab("client")}
            >
              Client uploads
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 cursor-pointer rounded-full text-[13px] font-medium transition-colors",
                fileSideTab === "deliverables"
                  ? "bg-ark-brand-red text-white shadow-[0px_4px_12px_rgba(255,0,0,0.25)]"
                  : "text-[#666] hover:bg-white/60"
              )}
              onClick={() => setFileSideTab("deliverables")}
            >
              Deliverables
            </button>
          </div>
          <div className="mt-4 max-h-[280px] space-y-3 overflow-y-auto [scrollbar-width:thin]">
            {filesLoading ? (
              <p className="text-[13px] text-[#666]">Loading files…</p>
            ) : sidebarFiles.length === 0 ? (
              <p className="text-[13px] text-[#666]">No files in this list.</p>
            ) : (
              sidebarFiles.map((f) => (
                <a
                  key={f.id}
                  href={f.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex cursor-pointer gap-3 rounded-2xl border border-[#ECECEC] bg-[#FAFAFA] p-2 transition-colors hover:border-[#DDD]"
                >
                  <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#FFD6E0] to-[#E8E4FF]">
                    <span className="max-w-[2.5rem] truncate text-[10px] font-semibold text-[#3B3B3B]">
                      {f.name.split(".").pop() ?? "file"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[#1E1E1E]">
                      {f.name}
                    </p>
                    <p className="text-[11px] text-[#919191]">
                      {f.size_label}
                      {f.created_at ? ` · ${formatLongDate(f.created_at)}` : ""}
                    </p>
                  </div>
                </a>
              ))
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            className="mt-4 h-11 w-full rounded-full border-ark-brand-red bg-white font-display text-[14px] text-ark-brand-red shadow-[0px_8px_14px_0px_rgba(255,0,0,0.1)]"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Upload file"}
          </Button>
        </div>
      </aside>

      <Dialog.Root open={detailOpen} onOpenChange={setDetailOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 max-h-[min(640px,calc(100vh-48px))] w-[min(560px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#E0E0E0] bg-white p-6 shadow-xl outline-none data-[state=open]:animate-in"
          >
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="font-display text-xl text-[#1E1E1E]">
                Request details
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-[#E6E6E6] bg-[#F6F6F6] text-[#1E1E1E] hover:bg-[#ECECEC]"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Full request description and metadata
            </Dialog.Description>
            {detail ? (
              <div className="mt-5 space-y-4 text-[14px]">
                <div>
                  <p className="text-[12px] font-semibold text-[#919191]">Title</p>
                  <p className="mt-1 font-medium text-[#1E1E1E]">{detail.title}</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#919191]">Description</p>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-[#3B3B3B]">
                    {detail.description?.trim() || "—"}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[12px] font-semibold text-[#919191]">Requested by</p>
                    <p className="mt-1 font-medium text-[#1E1E1E]">
                      {detail.requester_display}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#919191]">Priority</p>
                    <p className="mt-1 font-medium text-[#1E1E1E]">{priorityLabel}</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#919191]">Status</p>
                    <p className="mt-1 font-medium text-[#1E1E1E]">{statusLabel || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#919191]">Submitted</p>
                    <p className="mt-1 font-medium text-[#1E1E1E]">
                      {formatLongDate(detail.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#919191]">Deadline</p>
                    <p className="mt-1 font-medium text-[#1E1E1E]">
                      {formatLongDate(detail.deadline)}
                    </p>
                  </div>
                  {detail.assignee_display ? (
                    <div>
                      <p className="text-[12px] font-semibold text-[#919191]">Assignee</p>
                      <p className="mt-1 font-medium text-[#1E1E1E]">
                        {detail.assignee_display}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-[14px] text-[#666]">Could not load details.</p>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
