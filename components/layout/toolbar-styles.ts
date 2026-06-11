import { cn } from "@/lib/utils"

/** Circular toolbar control (matches dashboard / list header) */
export function toolbarIconButtonClass(extra?: string) {
  return cn(
    "grid size-[42px] cursor-pointer place-items-center rounded-full border border-[#E6E6E6] bg-[#F6F6F6] text-[#4A4A4A] transition-colors hover:bg-[#ECECEC] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:text-[#EAEBEC] dark:hover:bg-[#2F3744]",
    extra
  )
}

/** Primary outline pill (e.g. List / Folder) */
export const toolbarPillActiveClass =
  "flex h-[42px] cursor-pointer items-center gap-2 rounded-full border border-ark-red-500 px-3 text-[14px] text-ark-red-500 shadow-[0px_8px_24px_0px_rgba(255,0,0,0.09)]"

export const toolbarPillIdleClass =
  "flex h-[42px] cursor-pointer items-center gap-2 rounded-full border border-[#DDD] px-3 text-[14px] text-black shadow-none dark:border-[#2F3744] dark:text-[#EAEBEC]"
