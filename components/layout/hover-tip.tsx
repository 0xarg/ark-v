"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type HoverTipProps = {
  label: string
  children: React.ReactElement
  side?: "top" | "bottom"
  className?: string
}

/**
 * Small hover/focus hint for icon buttons. Uses CSS only; also sets native title for a11y fallback.
 */
export function HoverTip({ label, children, side = "top", className }: HoverTipProps) {
  const child = React.Children.only(children) as React.ReactElement<{
    className?: string
    title?: string
    "aria-label"?: string
  }>
  const merged = React.cloneElement(child, {
    title: label,
    "aria-label": child.props["aria-label"] ?? label,
    className: cn("cursor-pointer", child.props.className),
  })

  return (
    <span
      className={cn(
        "group relative inline-flex",
        className
      )}
    >
      {merged}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 max-w-[220px] -translate-x-1/2 rounded-lg bg-[#2F3744] px-2.5 py-1.5 text-center text-[11px] leading-snug text-white opacity-0 shadow-md transition-opacity duration-150",
          "whitespace-normal break-words",
          "group-hover:opacity-100 group-focus-within:opacity-100",
          side === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"
        )}
      >
        {label}
        <span
          className={cn(
            "absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-[#2F3744]",
            side === "top" ? "-bottom-1" : "-top-1"
          )}
          aria-hidden
        />
      </span>
    </span>
  )
}
