"use client"

/* eslint-disable @next/next/no-img-element -- thumbnails and avatars use external URLs (R2, Dicebear). */

import type { User } from "@supabase/supabase-js"
import * as React from "react"
import { useRouter } from "next/navigation"
import { Folder, Loader2, Plus, Search, SlidersHorizontal, ArrowUpDown, Pencil, Trash2 } from "lucide-react"
import axios from "axios"

import {
  AppPageLoader,
  AppShellHeader,
  AppSidebar,
  HoverTip,
  MobileNavChips,
  SubscriptionSidebarCard,
  toolbarIconButtonClass,
  toolbarPillActiveClass,
  toolbarPillIdleClass,
} from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiDelete, apiGet, apiGetRaw, apiPatch, apiPost } from "@/lib/http/request"
import { createClient } from "@/lib/supabase/client"
import { useTeamSidebarSubscription } from "@/hooks/use-team-sidebar-subscription"
import { navItemsForRole } from "@/lib/navigation/app-nav"
import { cn } from "@/lib/utils"

type AppRole = "client" | "team" | "admin"

type BrandFolderRow = {
  id: string
  name: string
  sort_order: number
  created_at: string | null
  item_count: number
}

type BrandAssetRow = {
  id: string
  folder_id?: string
  file_url: string
  name: string
  size_label: string
  size_bytes: number | null
  created_at: string | null
}

type WorkCreatedRow = {
  id: string
  file_url: string
  name: string
  size_label: string
  created_label: string
  variant: "thumb" | "archive"
}

async function resolvePrimaryTeamId(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string | null> {
  const { data: memberRow } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()
  if (memberRow?.team_id && typeof memberRow.team_id === "string") {
    return memberRow.team_id
  }
  const { data: owned } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle()
  return owned?.id && typeof owned.id === "string" ? owned.id : null
}

function isImageish(name: string): boolean {
  const n = name.toLowerCase()
  return /\.(png|jpe?g|gif|webp|svg)$/.test(n)
}

export default function BrandAssetLibraryPage() {
  const supabase = React.useMemo(() => createClient(), [])
  const router = useRouter()

  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [appRole, setAppRole] = React.useState<AppRole | null>(null)
  const [teamId, setTeamId] = React.useState<string | null>(null)
  const [teamError, setTeamError] = React.useState<string | null>(null)

  const [unreadNotificationCount, setUnreadNotificationCount] = React.useState(0)
  const [headerSearch, setHeaderSearch] = React.useState("")

  const [folders, setFolders] = React.useState<BrandFolderRow[]>([])
  const [foldersLoading, setFoldersLoading] = React.useState(true)
  const [foldersError, setFoldersError] = React.useState<string | null>(null)

  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null)
  const [assets, setAssets] = React.useState<BrandAssetRow[]>([])
  const [assetsLoading, setAssetsLoading] = React.useState(false)
  const [assetsError, setAssetsError] = React.useState<string | null>(null)

  const [workItems, setWorkItems] = React.useState<WorkCreatedRow[]>([])
  const [workLoading, setWorkLoading] = React.useState(true)
  const [workError, setWorkError] = React.useState<string | null>(null)

  const [folderSort, setFolderSort] = React.useState<"name" | "count">("name")
  const [assetSort, setAssetSort] = React.useState<"date" | "name" | "size">("date")

  const [newFolderOpen, setNewFolderOpen] = React.useState(false)
  const [newFolderName, setNewFolderName] = React.useState("")
  const [newFolderSaving, setNewFolderSaving] = React.useState(false)
  const [renameFolder, setRenameFolder] = React.useState<{ id: string; name: string } | null>(null)
  const [renameFolderName, setRenameFolderName] = React.useState("")
  const [renameFolderSaving, setRenameFolderSaving] = React.useState(false)
  const [renameAsset, setRenameAsset] = React.useState<{ id: string; name: string } | null>(null)
  const [renameAssetName, setRenameAssetName] = React.useState("")
  const [renameAssetSaving, setRenameAssetSaving] = React.useState(false)
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    kind: "folder" | "asset"
    id: string
    name: string
  } | null>(null)
  const [deleteBusy, setDeleteBusy] = React.useState(false)
  const [assetActionBusyId, setAssetActionBusyId] = React.useState<string | null>(null)

  const [uploadBusy, setUploadBusy] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const navItems = React.useMemo(() => navItemsForRole(appRole), [appRole])
  const showSubmitTask = appRole === "client"
  const sidebarSub = useTeamSidebarSubscription(supabase, user?.id)

  React.useEffect(() => {
    void (async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) {
        router.push("/auth")
        return
      }
      setUser(authData.user)

      try {
        const me = await apiGet<{ app_role?: AppRole }>("/api/me")
        setAppRole(me.app_role ?? "client")
      } catch {
        setAppRole("client")
      }

      const tid = await resolvePrimaryTeamId(supabase, authData.user.id)
      if (!tid) {
        setTeamError("No team found for your account.")
      } else {
        setTeamId(tid)
      }
      setLoading(false)
    })()
  }, [router, supabase])

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
        /* ignore */
      }
    })()
  }, [user])

  const loadFolders = React.useCallback(async () => {
    if (!teamId) return
    setFoldersLoading(true)
    setFoldersError(null)
    try {
      const list = (await apiGet<BrandFolderRow[]>(`/api/teams/${teamId}/brand-folders`)) ?? []
      setFolders(list)
      setSelectedFolderId((prev) => {
        if (prev && list.some((f) => f.id === prev)) return prev
        return list[0]?.id ?? null
      })
    } catch (e) {
      setFoldersError(e instanceof Error ? e.message : "Failed to load folders")
    } finally {
      setFoldersLoading(false)
    }
  }, [teamId])

  React.useEffect(() => {
    void loadFolders()
  }, [loadFolders])

  const loadAssets = React.useCallback(async () => {
    if (!teamId || !selectedFolderId) {
      setAssets([])
      return
    }
    setAssetsLoading(true)
    setAssetsError(null)
    try {
      const data = await apiGet<BrandAssetRow[]>(
        `/api/teams/${teamId}/brand-assets?folder_id=${encodeURIComponent(
          selectedFolderId
        )}`
      )
      setAssets(data ?? [])
    } catch (e) {
      setAssetsError(e instanceof Error ? e.message : "Failed to load assets")
    } finally {
      setAssetsLoading(false)
    }
  }, [teamId, selectedFolderId])

  React.useEffect(() => {
    void loadAssets()
  }, [loadAssets])

  const loadWork = React.useCallback(async () => {
    if (!teamId) return
    setWorkLoading(true)
    setWorkError(null)
    try {
      const data = await apiGet<WorkCreatedRow[]>(`/api/teams/${teamId}/work-created`)
      setWorkItems(data ?? [])
    } catch (e) {
      setWorkError(e instanceof Error ? e.message : "Failed to load work")
    } finally {
      setWorkLoading(false)
    }
  }, [teamId])

  React.useEffect(() => {
    void loadWork()
  }, [loadWork])

  const needle = headerSearch.trim().toLowerCase()

  const visibleFolders = React.useMemo(() => {
    let list = folders.filter((f) =>
      needle.length === 0 ? true : f.name.toLowerCase().includes(needle)
    )
    list = [...list].sort((a, b) => {
      if (folderSort === "count") {
        return b.item_count - a.item_count || a.name.localeCompare(b.name)
      }
      return a.name.localeCompare(b.name)
    })
    return list
  }, [folders, needle, folderSort])

  const visibleAssets = React.useMemo(() => {
    let list = assets.filter((a) =>
      needle.length === 0 ? true : a.name.toLowerCase().includes(needle)
    )
    list = [...list].sort((a, b) => {
      if (assetSort === "name") {
        return a.name.localeCompare(b.name)
      }
      if (assetSort === "size") {
        const sa = a.size_bytes ?? -1
        const sb = b.size_bytes ?? -1
        return sb - sa
      }
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0
      return tb - ta
    })
    return list
  }, [assets, needle, assetSort])

  const visibleWork = React.useMemo(() => {
    return workItems.filter((w) =>
      needle.length === 0 ? true : w.name.toLowerCase().includes(needle)
    )
  }, [workItems, needle])

  const cycleFolderSort = () => {
    setFolderSort((s) => (s === "name" ? "count" : "name"))
  }

  const cycleAssetSort = () => {
    setAssetSort((s) => {
      if (s === "date") return "name"
      if (s === "name") return "size"
      return "date"
    })
  }

  const handleCreateFolder = async () => {
    if (!teamId || newFolderName.trim().length === 0) return
    setNewFolderSaving(true)
    try {
      const created = await apiPost<BrandFolderRow>(`/api/teams/${teamId}/brand-folders`, {
        name: newFolderName.trim(),
      })
      setFolders((prev) => [...prev, created])
      setSelectedFolderId(created.id)
      setNewFolderOpen(false)
      setNewFolderName("")
    } catch (e) {
      setFoldersError(e instanceof Error ? e.message : "Could not create folder")
    } finally {
      setNewFolderSaving(false)
    }
  }

  const handleRenameFolder = async () => {
    if (!teamId || !renameFolder || renameFolderName.trim().length === 0) return
    const nextName = renameFolderName.trim()
    const previous = folders.find((f) => f.id === renameFolder.id)
    if (!previous) return
    setRenameFolderSaving(true)
    setFolders((prev) => prev.map((f) => (f.id === renameFolder.id ? { ...f, name: nextName } : f)))
    try {
      await apiPatch<BrandFolderRow>(`/api/teams/${teamId}/brand-folders`, {
        folder_id: renameFolder.id,
        name: nextName,
      })
      setRenameFolder(null)
      setRenameFolderName("")
    } catch (e) {
      setFolders((prev) => prev.map((f) => (f.id === previous.id ? previous : f)))
      setFoldersError(e instanceof Error ? e.message : "Could not rename folder")
    } finally {
      setRenameFolderSaving(false)
    }
  }

  const handleRenameAsset = async () => {
    if (!teamId || !renameAsset || renameAssetName.trim().length === 0) return
    const nextName = renameAssetName.trim()
    const previous = assets.find((a) => a.id === renameAsset.id)
    if (!previous) return
    setRenameAssetSaving(true)
    setAssets((prev) => prev.map((a) => (a.id === renameAsset.id ? { ...a, name: nextName } : a)))
    try {
      await apiPatch<BrandAssetRow>(`/api/teams/${teamId}/brand-assets`, {
        asset_id: renameAsset.id,
        file_name: nextName,
      })
      setRenameAsset(null)
      setRenameAssetName("")
    } catch (e) {
      setAssets((prev) => prev.map((a) => (a.id === previous.id ? previous : a)))
      setAssetsError(e instanceof Error ? e.message : "Could not rename file")
    } finally {
      setRenameAssetSaving(false)
    }
  }

  const handleMoveAsset = async (assetId: string, targetFolderId: string) => {
    if (!teamId || !selectedFolderId || targetFolderId === selectedFolderId) return
    const previousAsset = assets.find((a) => a.id === assetId)
    if (!previousAsset) return

    setAssetActionBusyId(assetId)
    setAssets((prev) => prev.filter((a) => a.id !== assetId))
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id === selectedFolderId) {
          return { ...f, item_count: Math.max(0, f.item_count - 1) }
        }
        if (f.id === targetFolderId) {
          return { ...f, item_count: f.item_count + 1 }
        }
        return f
      })
    )

    try {
      await apiPatch<BrandAssetRow>(`/api/teams/${teamId}/brand-assets`, {
        asset_id: assetId,
        folder_id: targetFolderId,
      })
    } catch (e) {
      setAssets((prev) => [previousAsset, ...prev])
      setFolders((prev) =>
        prev.map((f) => {
          if (f.id === selectedFolderId) {
            return { ...f, item_count: f.item_count + 1 }
          }
          if (f.id === targetFolderId) {
            return { ...f, item_count: Math.max(0, f.item_count - 1) }
          }
          return f
        })
      )
      setAssetsError(e instanceof Error ? e.message : "Could not move file")
    } finally {
      setAssetActionBusyId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!teamId || !deleteConfirm) return
    setDeleteBusy(true)

    try {
      if (deleteConfirm.kind === "asset") {
        const previousAsset = assets.find((a) => a.id === deleteConfirm.id)
        if (!previousAsset) {
          setDeleteConfirm(null)
          return
        }
        setAssets((prev) => prev.filter((a) => a.id !== deleteConfirm.id))
        if (selectedFolderId) {
          setFolders((prev) =>
            prev.map((f) =>
              f.id === selectedFolderId ? { ...f, item_count: Math.max(0, f.item_count - 1) } : f
            )
          )
        }
        await apiDelete<{ id: string }>(`/api/teams/${teamId}/brand-assets`, {
          asset_id: deleteConfirm.id,
        })
      } else {
        const previousFolder = folders.find((f) => f.id === deleteConfirm.id)
        if (!previousFolder) {
          setDeleteConfirm(null)
          return
        }
        if (previousFolder.item_count > 0) {
          setFoldersError("Folder is not empty. Move or delete assets first.")
          return
        }
        setFolders((prev) => prev.filter((f) => f.id !== deleteConfirm.id))
        if (selectedFolderId === deleteConfirm.id) {
          const nextFolder = folders.find((f) => f.id !== deleteConfirm.id)
          setSelectedFolderId(nextFolder?.id ?? null)
        }
        await apiDelete<{ id: string }>(`/api/teams/${teamId}/brand-folders`, {
          folder_id: deleteConfirm.id,
        })
      }
      setDeleteConfirm(null)
    } catch (e) {
      if (deleteConfirm.kind === "folder") {
        await loadFolders()
      } else {
        await Promise.all([loadFolders(), loadAssets()])
      }
      const message = e instanceof Error ? e.message : "Delete failed"
      if (deleteConfirm.kind === "folder") {
        setFoldersError(message)
      } else {
        setAssetsError(message)
      }
    } finally {
      setDeleteBusy(false)
    }
  }

  const handlePickUpload = () => {
    if (!selectedFolderId) {
      alert("Select a folder first.")
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !teamId || !selectedFolderId) return

    setUploadBusy(true)
    try {
      const signed = await apiPost<{ upload_url: string; object_key: string }>(
        `/api/teams/${teamId}/brand-assets/upload-url`,
        {
          folder_id: selectedFolderId,
          file_name: file.name,
          content_type: file.type || "application/octet-stream",
        }
      )
      if (!signed?.upload_url || !signed?.object_key) {
        throw new Error("Could not start upload")
      }

      await axios.put(signed.upload_url, file, {
        headers: { "Content-Type": file.type || "application/octet-stream" },
      })

      const createdAsset = await apiPost<BrandAssetRow>(`/api/teams/${teamId}/brand-assets`, {
        folder_id: selectedFolderId,
        object_key: signed.object_key,
        file_name: file.name,
        content_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      })
      setAssets((prev) => [createdAsset, ...prev])
      setFolders((prev) =>
        prev.map((f) =>
          f.id === selectedFolderId
            ? {
                ...f,
                item_count: f.item_count + 1,
              }
            : f
        )
      )
    } catch (err) {
      setAssetsError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploadBusy(false)
    }
  }

  const pageBootstrapLoading =
    loading ||
    sidebarSub.loading ||
    (!teamError && teamId != null && (foldersLoading || workLoading))

  if (pageBootstrapLoading) {
    return <AppPageLoader variant="shell" />
  }

  if (teamError || !teamId) {
    return (
      <div className="min-h-screen bg-background p-6 text-[14px] text-[#666] dark:text-[#BFC1C5]">
        {teamError ?? "No team available."}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-3 text-foreground sm:p-4 lg:p-[18px]">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
      />

      {newFolderOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-folder-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-lg dark:border-[#2A3444] dark:bg-[#141C27]">
            <h2 id="new-folder-title" className="font-display text-[20px] text-[#1E1E1E]">
              New folder
            </h2>
            <p className="mt-1 text-[14px] text-[#919191]">Name your brand asset folder.</p>
            <Input
              className="mt-4 h-11 rounded-xl border-[#E6E6E6]"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(ev) => setNewFolderName(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") void handleCreateFolder()
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setNewFolderOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-full bg-[#2F3744] text-white hover:bg-[#2F3744]/90"
                disabled={newFolderSaving || newFolderName.trim().length === 0}
                onClick={() => void handleCreateFolder()}
              >
                {newFolderSaving ? <Loader2 className="size-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {renameFolder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-lg dark:border-[#2A3444] dark:bg-[#141C27]">
            <h2 className="font-display text-[20px] text-[#1E1E1E]">Rename folder</h2>
            <Input
              className="mt-4 h-11 rounded-xl border-[#E6E6E6]"
              value={renameFolderName}
              onChange={(ev) => setRenameFolderName(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") void handleRenameFolder()
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setRenameFolder(null)}>
                Cancel
              </Button>
              <Button type="button" className="rounded-full bg-[#2F3744] text-white hover:bg-[#2F3744]/90" disabled={renameFolderSaving || renameFolderName.trim().length === 0} onClick={() => void handleRenameFolder()}>
                {renameFolderSaving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {renameAsset ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-lg dark:border-[#2A3444] dark:bg-[#141C27]">
            <h2 className="font-display text-[20px] text-[#1E1E1E]">Rename file</h2>
            <Input
              className="mt-4 h-11 rounded-xl border-[#E6E6E6]"
              value={renameAssetName}
              onChange={(ev) => setRenameAssetName(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") void handleRenameAsset()
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setRenameAsset(null)}>
                Cancel
              </Button>
              <Button type="button" className="rounded-full bg-[#2F3744] text-white hover:bg-[#2F3744]/90" disabled={renameAssetSaving || renameAssetName.trim().length === 0} onClick={() => void handleRenameAsset()}>
                {renameAssetSaving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {deleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-lg dark:border-[#2A3444] dark:bg-[#141C27]">
            <h2 className="font-display text-[20px] text-[#1E1E1E]">
              Delete {deleteConfirm.kind === "folder" ? "folder" : "file"}?
            </h2>
            <p className="mt-2 text-[14px] text-[#6B6B6B]">
              This will remove <span className="font-medium text-[#1E1E1E]">&quot;{deleteConfirm.name}&quot;</span>.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setDeleteConfirm(null)} disabled={deleteBusy}>
                Cancel
              </Button>
              <Button type="button" className="rounded-full bg-ark-red-500 text-white hover:bg-ark-red-500/90" onClick={() => void handleConfirmDelete()} disabled={deleteBusy}>
                {deleteBusy ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
            title="Brand Asset Library"
            search={{
              id: "brand-lib-header-search",
              value: headerSearch,
              onChange: setHeaderSearch,
              placeholder: "Search folders and files…",
            }}
            showSubmitTask={showSubmitTask}
            onSubmitTask={() => router.push("/submit-request")}
            unreadCount={unreadNotificationCount}
            userEmail={user?.email ?? "user"}
          />

          {/* Brand Asset panel */}
          <section className="min-h-[390px] w-full rounded-2xl border border-[#E0E0E0] bg-white px-4 py-5 dark:border-[#2A3444] dark:bg-[#141C27] sm:px-6 sm:py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="font-display text-[24px] text-[#1E1E1E]">Brand Asset</h2>
                <p className="mt-1 max-w-xl text-[14px] text-[#919191]">
                  Manage your brand assets and access all work created by ARKHV in one place.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <HoverTip label="Create a new folder for organizing uploads.">
                  <button
                    type="button"
                    onClick={() => setNewFolderOpen(true)}
                    className={toolbarPillActiveClass}
                  >
                    <Folder className="size-5 shrink-0" />
                    Folder
                  </button>
                </HoverTip>
                <HoverTip label="Upload files into the selected folder (pick a folder first).">
                  <button
                    type="button"
                    disabled={uploadBusy || !selectedFolderId}
                    onClick={handlePickUpload}
                    className={cn(toolbarPillIdleClass, "disabled:cursor-not-allowed disabled:opacity-50")}
                  >
                    {uploadBusy ? (
                      <Loader2 className="size-5 shrink-0 animate-spin" />
                    ) : (
                      <Plus className="size-5 shrink-0" />
                    )}
                    Upload
                  </button>
                </HoverTip>
                <div className="mx-1 hidden h-8 w-px bg-[#E6E6E6] lg:block" aria-hidden />
                <HoverTip label="Focus the search field in the page header.">
                  <button
                    type="button"
                    onClick={() => document.getElementById("brand-lib-header-search")?.focus()}
                    className={toolbarIconButtonClass()}
                  >
                    <Search className="size-5" />
                  </button>
                </HoverTip>
                <HoverTip
                  label={
                    folderSort === "name"
                      ? "Folders sorted A–Z. Click to sort by item count."
                      : "Folders sorted by item count. Click to sort by name."
                  }
                >
                  <button type="button" onClick={cycleFolderSort} className={toolbarIconButtonClass()}>
                    <ArrowUpDown className="size-5" />
                  </button>
                </HoverTip>
                <HoverTip
                  label={
                    assetSort === "date"
                      ? "Files sorted by newest. Cycles: date → name → size."
                      : assetSort === "name"
                        ? "Files sorted by name. Cycles: date → name → size."
                        : "Files sorted by size. Cycles: date → name → size."
                  }
                >
                  <button type="button" onClick={cycleAssetSort} className={toolbarIconButtonClass()}>
                    <SlidersHorizontal className="size-5" />
                  </button>
                </HoverTip>
              </div>
            </div>

            {foldersError ? (
              <p className="mt-4 text-[14px] text-ark-red-500">{foldersError}</p>
            ) : null}
            {foldersLoading ? (
              <div className="mt-6 rounded-xl border border-dashed border-[#E6E6E6]">
                <AppPageLoader variant="inline" className="min-h-[140px] py-8" />
              </div>
            ) : (
              <div className="mt-6 w-full min-w-0 px-0.5 sm:px-1">
                <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                  {visibleFolders.map((f) => {
                    const selected = f.id === selectedFolderId
                    return (
                      <div
                        key={f.id}
                        className={cn(
                          "flex min-w-0 flex-col rounded-2xl p-2 text-left transition",
                          selected
                            ? "ring-2 ring-ark-red-500"
                            : "hover:bg-black/2"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedFolderId(f.id)}
                          className="text-left outline-none ring-offset-4 ring-offset-white focus-visible:ring-2 focus-visible:ring-ark-red-500/50"
                        >
                          <div
                            className={cn(
                              "flex h-[112px] items-center justify-center rounded-xl sm:h-[130px] md:h-[140px]",
                              selected ? "bg-[#E8F4FF]" : "bg-[#F2F8FF]"
                            )}
                          >
                            <Folder
                              className="size-12 text-[#6BB3F0] opacity-90 sm:size-14 md:size-16"
                              strokeWidth={1.25}
                            />
                          </div>
                          <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-snug text-[#1E1E1E] sm:text-[14px]">
                            {f.name}
                          </p>
                          <p className="text-[11px] text-[#838383] sm:text-[12px]">
                            {f.item_count} {f.item_count === 1 ? "item" : "items"}
                          </p>
                        </button>
                        <div className="mt-2 flex items-center gap-1">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E6E6E6] px-2 py-1 text-[11px] text-[#5C5C5C] hover:bg-[#F7F7F7]"
                            onClick={() => {
                              setRenameFolder({ id: f.id, name: f.name })
                              setRenameFolderName(f.name)
                            }}
                          >
                            <Pencil className="size-3" />
                            Rename
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-[#F1D3D3] px-2 py-1 text-[11px] text-ark-red-500 hover:bg-[#FFF4F4]"
                            onClick={() => setDeleteConfirm({ kind: "folder", id: f.id, name: f.name })}
                            disabled={f.item_count > 0}
                            title={f.item_count > 0 ? "Folder must be empty before deleting." : "Delete folder"}
                          >
                            <Trash2 className="size-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-[#F0F0F0] pt-6">
              <p className="text-[14px] font-medium text-[#1E1E1E]">
                {selectedFolderId
                  ? `Files in “${folders.find((x) => x.id === selectedFolderId)?.name ?? "folder"}”`
                  : "Select a folder"}
              </p>
              {assetsError ? (
                <p className="mt-2 text-[14px] text-ark-red-500">{assetsError}</p>
              ) : null}
              {assetsLoading ? (
                <div className="mt-4 rounded-xl border border-dashed border-[#E6E6E6]">
                  <AppPageLoader variant="inline" className="min-h-[120px] py-6" />
                </div>
              ) : visibleAssets.length === 0 ? (
                <p className="mt-3 text-[14px] text-[#919191]">No files yet. Upload to this folder.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {visibleAssets.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-col gap-2 rounded-xl border border-[#F0F0F0] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <a
                          href={a.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="cursor-pointer truncate text-[14px] font-medium text-[#1E1E1E] underline-offset-2 hover:underline"
                        >
                          {a.name}
                        </a>
                        <span className="shrink-0 text-[12px] text-[#838383]">{a.size_label}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={selectedFolderId ?? ""}
                          onChange={(ev) => void handleMoveAsset(a.id, ev.target.value)}
                          disabled={assetActionBusyId === a.id}
                          className="h-8 rounded-md border border-[#E6E6E6] px-2 text-[12px]"
                        >
                          {folders.map((f) => (
                            <option key={f.id} value={f.id}>
                              Move to: {f.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E6E6E6] px-2 py-1 text-[11px] text-[#5C5C5C] hover:bg-[#F7F7F7]"
                          onClick={() => {
                            setRenameAsset({ id: a.id, name: a.name })
                            setRenameAssetName(a.name)
                          }}
                          disabled={assetActionBusyId === a.id}
                        >
                          <Pencil className="size-3" />
                          Rename
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#F1D3D3] px-2 py-1 text-[11px] text-ark-red-500 hover:bg-[#FFF4F4]"
                          onClick={() => setDeleteConfirm({ kind: "asset", id: a.id, name: a.name })}
                          disabled={assetActionBusyId === a.id}
                        >
                          <Trash2 className="size-3" />
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Work created */}
          <section className="min-h-[390px] w-full rounded-2xl border border-[#E0E0E0] bg-white px-4 py-5 dark:border-[#2A3444] dark:bg-[#141C27] sm:px-6 sm:py-6">
            <div>
              <h2 className="font-display text-[24px] text-[#1E1E1E]">Work Created by Team</h2>
              <p className="mt-1 text-[14px] text-[#919191]">Work Created by ARKHV</p>
            </div>
            {workError ? (
              <p className="mt-4 text-[14px] text-ark-red-500">{workError}</p>
            ) : null}
            {workLoading ? (
              <div className="mt-6 rounded-xl border border-dashed border-[#E6E6E6]">
                <AppPageLoader variant="inline" className="min-h-[140px] py-8" />
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap gap-4">
                {visibleWork.map((w) => (
                  <a
                    key={w.id}
                    href={w.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "relative flex h-[166px] w-full min-w-[260px] max-w-[351px] flex-1 cursor-pointer overflow-hidden rounded-2xl sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]",
                      w.variant === "archive" ? "bg-[#FFF6EF]" : ""
                    )}
                  >
                    {w.variant === "thumb" && isImageish(w.name) ? (
                      <>
                        <img
                          src={w.file_url}
                          alt=""
                          className="absolute inset-0 size-full object-cover"
                        />
                        <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/80" />
                      </>
                    ) : w.variant === "thumb" ? (
                      <div className="absolute inset-0 bg-linear-to-br from-[#2F3744] to-[#508CF0]" />
                    ) : null}
                    {w.variant === "archive" ? (
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <Folder className="size-16 text-[#F8B77B]" />
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        "relative mt-auto flex w-full flex-col gap-0.5 p-4",
                        w.variant === "archive" ? "text-[#1E1E1E]" : "text-white"
                      )}
                    >
                      <span className="truncate text-[16px] font-medium">{w.name}</span>
                      <div
                        className={cn(
                          "flex justify-between text-[14px]",
                          w.variant === "archive" ? "text-[#838383]" : "text-white/80"
                        )}
                      >
                        <span>{w.size_label}</span>
                        <span>{w.created_label}</span>
                      </div>
                    </div>
                  </a>
                ))}
                {visibleWork.length === 0 ? (
                  <p className="text-[14px] text-[#919191]">No deliverables from ARKHV yet.</p>
                ) : null}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
