import * as React from "react"

import { PlaceholderRow } from "@/components/ui/placeholder-row"
import { cn } from "@/lib/utils"

/** List row with a leading selection control (checkbox / radio / switch) — Figma dropdown row + 8px gap */
export function SelectionRow({
  className,
  leading,
  children,
  ...props
}: React.ComponentProps<typeof PlaceholderRow> & {
  leading: React.ReactNode
}) {
  return (
    <PlaceholderRow className={cn("gap-2", className)} {...props}>
      <div className="flex shrink-0 items-center justify-center">{leading}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </PlaceholderRow>
  )
}
