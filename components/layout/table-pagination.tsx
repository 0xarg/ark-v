"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

type TablePaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

/**
 * Renders nothing when all content fits on one page.
 * Prev hidden on first page; next hidden on last page.
 */
export function TablePagination({
  page,
  totalPages,
  onPageChange,
  className,
}: TablePaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-1",
        className
      )}
    >
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => canPrev && onPageChange(page - 1)}
        className={cn(
          "grid size-[42px] place-items-center rounded-[26px] border border-[#E6E6E6] text-[#4A4A4A] transition-opacity",
          canPrev
            ? "cursor-pointer bg-[#F6F6F6] hover:bg-[#ECECEC]"
            : "cursor-not-allowed opacity-40"
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-5" />
      </button>
      <div className="flex flex-wrap items-center justify-center gap-2 text-[14px] text-[#1E1E1E]">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPageChange(n)}
            className={cn(
              "grid h-8 min-w-[32px] cursor-pointer place-items-center rounded-full px-2 transition-colors",
              n === page
                ? "border-[1.5px] border-ark-red-500 text-ark-red-500"
                : "bg-[#F6F6F6] hover:bg-[#ECECEC]"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!canNext}
        onClick={() => canNext && onPageChange(page + 1)}
        className={cn(
          "grid size-[42px] place-items-center rounded-[26px] border border-[#E6E6E6] text-[#4A4A4A] transition-opacity",
          canNext
            ? "cursor-pointer bg-[#F6F6F6] hover:bg-[#ECECEC]"
            : "cursor-not-allowed opacity-40"
        )}
        aria-label="Next page"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  )
}
