"use client";

import * as React from "react";
import { Folder, Loader2, Search, X } from "lucide-react";

import { apiGet } from "@/lib/http/request";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type BrandFolder = {
  id: string;
  name: string;
  item_count: number;
};

type BrandAsset = {
  id: string;
  file_url: string;
  name: string;
  size_label: string;
};

export type PickedAsset = {
  id: string;
  name: string;
  file_url: string;
  size_label: string;
};

type Props = {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  initialSelected: PickedAsset[];
  onClose: () => void;
  onConfirm: (assets: PickedAsset[]) => void;
};

async function resolveTeamId(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return typeof data?.team_id === "string" ? data.team_id : null;
}

function isImageFile(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
}

export function BrandAssetPicker({
  supabase,
  userId,
  initialSelected,
  onClose,
  onConfirm,
}: Props) {
  const [teamId, setTeamId] = React.useState<string | null>(null);
  const [teamError, setTeamError] = React.useState<string | null>(null);

  const [folders, setFolders] = React.useState<BrandFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = React.useState(true);
  const [foldersError, setFoldersError] = React.useState<string | null>(null);

  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [assets, setAssets] = React.useState<BrandAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = React.useState(false);
  const [assetsError, setAssetsError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [checkedIds, setCheckedIds] = React.useState<Set<string>>(
    () => new Set(initialSelected.map((a) => a.id)),
  );
  // Keep a map of id → asset so we can reconstruct PickedAsset on confirm
  const [assetMap, setAssetMap] = React.useState<Map<string, PickedAsset>>(
    () => new Map(initialSelected.map((a) => [a.id, a])),
  );

  // Resolve team on mount
  React.useEffect(() => {
    void (async () => {
      const tid = await resolveTeamId(supabase, userId);
      if (!tid) {
        setTeamError("No team found. Upload files from your computer instead.");
        setFoldersLoading(false);
        return;
      }
      setTeamId(tid);
    })();
  }, [supabase, userId]);

  // Load folders once team is known
  React.useEffect(() => {
    if (!teamId) return;
    void (async () => {
      setFoldersLoading(true);
      setFoldersError(null);
      try {
        const list =
          (await apiGet<BrandFolder[]>(`/api/teams/${teamId}/brand-folders`)) ?? [];
        setFolders(list);
        setSelectedFolderId(list[0]?.id ?? null);
      } catch (e) {
        setFoldersError(e instanceof Error ? e.message : "Failed to load folders");
      } finally {
        setFoldersLoading(false);
      }
    })();
  }, [teamId]);

  // Load assets when folder changes
  React.useEffect(() => {
    if (!teamId || !selectedFolderId) {
      setAssets([]);
      return;
    }
    void (async () => {
      setAssetsLoading(true);
      setAssetsError(null);
      try {
        const list =
          (await apiGet<BrandAsset[]>(
            `/api/teams/${teamId}/brand-assets?folder_id=${encodeURIComponent(selectedFolderId)}`,
          )) ?? [];
        setAssets(list);
        // Merge new assets into the map so we keep names/urls for checked items
        setAssetMap((prev) => {
          const next = new Map(prev);
          for (const a of list) {
            next.set(a.id, a);
          }
          return next;
        });
      } catch (e) {
        setAssetsError(e instanceof Error ? e.message : "Failed to load assets");
      } finally {
        setAssetsLoading(false);
      }
    })();
  }, [teamId, selectedFolderId]);

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const needle = search.trim().toLowerCase();
  const visibleAssets = needle
    ? assets.filter((a) => a.name.toLowerCase().includes(needle))
    : assets;

  const toggle = (asset: BrandAsset) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) {
        next.delete(asset.id);
      } else {
        next.add(asset.id);
        setAssetMap((m) => new Map(m).set(asset.id, asset));
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const picked: PickedAsset[] = [...checkedIds]
      .map((id) => assetMap.get(id))
      .filter((a): a is PickedAsset => a != null);
    onConfirm(picked);
  };

  const checkedCount = checkedIds.size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Brand Asset Library picker"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-2xl flex-col rounded-2xl border border-[#E0E0E0] bg-white shadow-xl dark:border-[#2A3444] dark:bg-[#141C27]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F0F0F0] px-5 py-4 dark:border-[#2A3444]">
          <div>
            <h2 className="font-display text-[20px] text-[#1E1E1E] dark:text-white">
              Brand Asset Library
            </h2>
            <p className="text-[13px] text-[#919191] dark:text-[#BFC1C5]">
              Select files to attach to your request
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 cursor-pointer place-items-center rounded-full border border-[#E6E6E6] text-[#4A4A4A] transition-colors hover:bg-[#F6F6F6] dark:border-[#2F3744] dark:text-[#EAEBEC] dark:hover:bg-[#1A1E25]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-[#F0F0F0] px-5 py-3 dark:border-[#2A3444]">
          <div className="flex items-center gap-2 rounded-full border border-[#E6E6E6] bg-[#F9F9F9] px-3 py-2 dark:border-[#2F3744] dark:bg-[#1A1E25]">
            <Search className="size-4 shrink-0 text-[#B0B0B0]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files…"
              className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#C4C4C7] dark:placeholder:text-[#3A4050]"
            />
          </div>
        </div>

        {/* Body */}
        {teamError ? (
          <div className="px-5 py-8 text-center text-[14px] text-[#CE3426]">
            {teamError}
          </div>
        ) : foldersLoading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <Loader2 className="size-6 animate-spin text-[#B0B0B0]" />
          </div>
        ) : foldersError ? (
          <div className="px-5 py-8 text-center text-[14px] text-[#CE3426]">
            {foldersError}
          </div>
        ) : (
          <div className="flex min-h-[320px] overflow-hidden">
            {/* Folder sidebar */}
            <div className="w-[180px] shrink-0 overflow-y-auto border-r border-[#F0F0F0] py-2 dark:border-[#2A3444]">
              {folders.length === 0 ? (
                <p className="px-4 py-3 text-[13px] text-[#919191]">No folders</p>
              ) : (
                folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] transition-colors",
                      selectedFolderId === folder.id
                        ? "bg-[#F5F5F5] font-medium text-[#1E1E1E] dark:bg-[#1A1E25] dark:text-white"
                        : "text-[#555] hover:bg-[#FAFAFA] dark:text-[#BFC1C5] dark:hover:bg-[#1A1E25]",
                    )}
                  >
                    <Folder
                      className={cn(
                        "size-4 shrink-0",
                        selectedFolderId === folder.id
                          ? "text-[#6BB3F0]"
                          : "text-[#B0B0B0]",
                      )}
                    />
                    <span className="min-w-0 truncate">{folder.name}</span>
                    {folder.item_count > 0 ? (
                      <span className="ml-auto shrink-0 text-[11px] text-[#B0B0B0]">
                        {folder.item_count}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>

            {/* Asset list */}
            <div className="flex-1 overflow-y-auto">
              {assetsLoading ? (
                <div className="flex h-full min-h-[280px] items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-[#B0B0B0]" />
                </div>
              ) : assetsError ? (
                <p className="px-4 py-4 text-[13px] text-[#CE3426]">{assetsError}</p>
              ) : visibleAssets.length === 0 ? (
                <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-center">
                  <Folder className="size-8 text-[#D0D0D0]" />
                  <p className="text-[13px] text-[#919191]">
                    {assets.length === 0
                      ? "This folder is empty"
                      : "No files match your search"}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[#F5F5F5] dark:divide-[#2A3444]">
                  {visibleAssets.map((asset) => {
                    const checked = checkedIds.has(asset.id);
                    return (
                      <li key={asset.id}>
                        <button
                          type="button"
                          onClick={() => toggle(asset)}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                            checked
                              ? "bg-[rgba(255,0,0,0.03)] dark:bg-[rgba(255,0,0,0.05)]"
                              : "hover:bg-[#FAFAFA] dark:hover:bg-[#1A1E25]",
                          )}
                        >
                          {/* Thumbnail or icon */}
                          <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#ECECEC] bg-[#F5F5F5] dark:border-[#2F3744] dark:bg-[#1A1E25]">
                            {isImageFile(asset.name) ? (
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
                            <p className="truncate text-[13px] font-medium text-[#1E1E1E] dark:text-[#EAEBEC]">
                              {asset.name}
                            </p>
                            <p className="text-[12px] text-[#919191] dark:text-[#BFC1C5]">
                              {asset.size_label}
                            </p>
                          </div>

                          {/* Checkbox */}
                          <div
                            className={cn(
                              "grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                              checked
                                ? "border-ark-red-500 bg-ark-red-500"
                                : "border-[#D0D0D0] bg-white dark:border-[#2F3744] dark:bg-[#1A1E25]",
                            )}
                            aria-hidden
                          >
                            {checked ? (
                              <svg
                                viewBox="0 0 10 8"
                                className="size-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.8}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M1 4l3 3 5-6" />
                              </svg>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#F0F0F0] px-5 py-4 dark:border-[#2A3444]">
          <p className="text-[13px] text-[#919191] dark:text-[#BFC1C5]">
            {checkedCount === 0
              ? "No files selected"
              : `${checkedCount} file${checkedCount !== 1 ? "s" : ""} selected`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-[36px] cursor-pointer rounded-full bg-[#F6F6F6] px-5 text-[14px] font-medium text-black transition-colors hover:bg-[#ECECEC] dark:bg-[#1A1E25] dark:text-[#EAEBEC] dark:hover:bg-[#2F3744]"
            >
              Cancel
            </button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="h-[36px] cursor-pointer px-5 text-[14px]"
              onClick={handleConfirm}
              disabled={checkedCount === 0}
            >
              Attach {checkedCount > 0 ? checkedCount : ""}{" "}
              {checkedCount === 1 ? "File" : "Files"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
