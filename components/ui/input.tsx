import * as React from "react"

import { cn } from "@/lib/utils"

/** Figma placeholder / field text — 16px, grey label tone, 14px radius, 51px min height */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-[51px] w-full min-w-0 rounded-[14px] border border-[#e6e6e7] bg-background px-4 py-3 text-base leading-6 text-[#252527] font-sans shadow-none transition-[color,box-shadow] outline-none",
        "placeholder:text-[#6e7191]",
        "selection:bg-ark-red-100 selection:text-ark-black",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:border-[#2f3744] focus-visible:shadow-[0px_3px_14px_0px_rgba(47,55,68,0.1)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-ark-red-500 aria-invalid:ring-2 aria-invalid:ring-ark-red-500/20",
        "dark:border-ark-blue-700 dark:text-white dark:placeholder:text-ark-blue-400",
        className
      )}
      {...props}
    />
  )
}

export { Input }
