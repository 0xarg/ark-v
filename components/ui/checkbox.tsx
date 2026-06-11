"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { Check, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

/** Figma Master/Checkbox — 16px, 4px radius, border #adadb3; checked / indeterminate use brand red */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "group peer size-4 shrink-0 rounded-[4px] border border-[#adadb3] bg-white outline-none",
      "data-[state=checked]:border-ark-red-500 data-[state=checked]:bg-ark-red-500",
      "data-[state=indeterminate]:border-ark-red-500 data-[state=indeterminate]:bg-ark-red-500",
      "focus-visible:ring-2 focus-visible:ring-ark-blue-500/25",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
      <Check
        className="hidden size-3 stroke-[2.5] group-data-[state=checked]:block"
        strokeWidth={3}
        aria-hidden
      />
      <Minus
        className="hidden size-2.5 group-data-[state=indeterminate]:block"
        strokeWidth={3}
        aria-hidden
      />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = "Checkbox"

export { Checkbox }
