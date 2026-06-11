import * as React from "react"

import { cn } from "@/lib/utils"

/** Figma list row — 51px height, 14px radius, Instrument-style body text */
export function PlaceholderRow({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "muted" | "hover" | "selected"
}) {
  return (
    <div
      data-slot="placeholder-row"
      className={cn(
        "flex h-[51px] w-full items-center rounded-[14px] px-[17px] text-[14px] leading-normal font-sans text-[#252527] dark:text-white",
        variant === "default" && "bg-white dark:bg-transparent",
        variant === "muted" && "bg-[#f7f7f7] dark:bg-[#545b67]",
        variant === "hover" && "bg-[#f7f7f7] dark:bg-[#545b67]",
        variant === "selected" && "bg-[#f7f7f7] dark:bg-[#545b67]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
