import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/** Figma node 20:1183 — pill, gap 8px, Inter Bold 16 / 24 */
const pad = {
  lg: {
    none: "px-16 py-[18px]",
    right: "px-12 py-[18px]",
    left: "px-12 py-[18px]",
  },
  md: {
    none: "px-12 py-3",
    right: "px-8 py-3",
    left: "px-8 py-3",
  },
  sm: {
    none: "px-8 py-2",
    right: "px-6 py-2",
    left: "px-6 py-2",
  },
} as const

type ArkSize = "lg" | "md" | "sm"
type IconPos = "none" | "left" | "right"

function paddingFor(size: ArkSize, icon: IconPos) {
  const key = icon === "none" ? "none" : icon
  return pad[size][key]
}

const arkVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border-[1.5px] text-center text-base font-bold leading-6 transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 font-button",
  {
    variants: {
      variant: {
        primary:
          "border-ark-red-500 bg-transparent text-ark-red-500 hover:border-ark-red-600 hover:bg-[rgba(255,0,0,0.05)] active:border-ark-red-600 active:bg-[rgba(255,0,0,0.05)] focus-visible:border-ark-red-500 focus-visible:bg-[rgba(255,0,0,0.2)] disabled:border-transparent disabled:bg-ark-blue-500 disabled:text-ark-blue-300 disabled:opacity-50",
        secondary:
          "border-transparent bg-[#2b323e] text-white shadow-[0px_4px_14px_0px_rgba(0,0,0,0.04)] hover:bg-[#262d3a] hover:shadow-[0px_4px_9px_0px_rgba(0,0,0,0.04)] focus-visible:bg-[#1a1e25] active:bg-[#2b323e] disabled:border-[1.5px] disabled:border-ark-blue-300 disabled:bg-transparent disabled:text-ark-blue-300 disabled:opacity-50 disabled:shadow-none",
        text:
          "border-transparent bg-transparent text-[#252527] hover:text-ark-blue-200 focus-visible:ring-2 focus-visible:ring-ark-blue-500/25 active:text-ark-blue-100 disabled:text-ark-blue-300 disabled:opacity-50 dark:text-[#eaebec]",
        link: "rounded-none border-transparent border-0 bg-transparent px-1 py-0 font-sans text-base font-normal text-primary underline-offset-4 hover:underline",
        destructive:
          "border-ark-red-500 bg-transparent text-ark-red-500 hover:border-ark-red-600 hover:bg-[rgba(255,0,0,0.05)] focus-visible:border-ark-red-500 focus-visible:bg-[rgba(255,0,0,0.2)] disabled:border-transparent disabled:bg-ark-blue-500 disabled:text-ark-blue-300 disabled:opacity-50",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
)

type LegacyVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
  | "primary"
  | "text"

type LegacySize =
  | "default"
  | "xs"
  | "sm"
  | "lg"
  | "md"
  | "icon"
  | "icon-xs"
  | "icon-sm"
  | "icon-lg"

type ArkVariantName = NonNullable<VariantProps<typeof arkVariants>["variant"]>

function resolveVariant(
  variant: LegacyVariant | "primary" | "secondary" | "text" | undefined
): ArkVariantName {
  if (variant === "destructive") return "destructive"
  if (variant === "outline") return "secondary"
  if (variant === "ghost") return "text"
  if (variant === "default") return "primary"
  if (variant === "link") return "link"
  if (variant === "secondary") return "secondary"
  if (variant === "text") return "text"
  if (variant === "primary") return "primary"
  return "primary"
}

type ResolvedSize = ArkSize | "icon" | "icon-xs" | "icon-sm" | "icon-lg"

function resolveSize(size: ArkSize | LegacySize | undefined): ResolvedSize {
  if (size === "lg") return "lg"
  if (size === "sm" || size === "xs") return "sm"
  if (
    size === "icon" ||
    size === "icon-xs" ||
    size === "icon-sm" ||
    size === "icon-lg"
  )
    return size
  return "md"
}

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    Omit<VariantProps<typeof arkVariants>, "variant"> & {
      variant?: LegacyVariant | "primary" | "secondary" | "text"
      size?: ArkSize | LegacySize
      iconPosition?: IconPos
      icon?: React.ReactNode
      asChild?: boolean
    }
>(
  (
    {
      className,
      variant = "primary",
      size: sizeProp = "md",
      iconPosition = "none",
      icon,
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const v = resolveVariant(variant)
    const rs = resolveSize(sizeProp)
    const isIconOnly =
      rs === "icon" ||
      rs === "icon-xs" ||
      rs === "icon-sm" ||
      rs === "icon-lg"

    const sz: ArkSize =
      rs === "lg" ? "lg" : rs === "sm" ? "sm" : "md"

    const showArrow = iconPosition !== "none" && v !== "link"
    /** Radix Slot requires a single child; arrows need a native button wrapper */
    const useSlot = Boolean(asChild && !showArrow)
    const Comp = useSlot ? Slot.Root : "button"

    const IconNode =
      icon ??
      (showArrow ? (
        iconPosition === "right" ? (
          <ArrowRight className="size-6 stroke-[1.75]" aria-hidden />
        ) : (
          <ArrowLeft className="size-6 stroke-[1.75]" aria-hidden />
        )
      ) : null)

    const iconDim =
      rs === "icon-xs"
        ? "size-6 min-h-6 min-w-6"
        : rs === "icon-sm"
          ? "size-8 min-h-8 min-w-8"
          : rs === "icon-lg"
            ? "size-12 min-h-12 min-w-12"
            : rs === "icon"
              ? "size-11 min-h-11 min-w-11"
              : ""

    if (isIconOnly) {
      return (
        <Comp
          ref={ref}
          data-slot="button"
          className={cn(
            arkVariants({ variant: v === "link" ? "primary" : v }),
            iconDim,
            className
          )}
          {...props}
        >
          {children}
        </Comp>
      )
    }

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-variant={v}
        data-size={sz}
        className={cn(
          arkVariants({ variant: v }),
          v !== "link" && paddingFor(sz, showArrow ? iconPosition : "none"),
          className
        )}
        {...props}
      >
        {IconNode && iconPosition === "left" ? IconNode : null}
        {children}
        {IconNode && iconPosition === "right" ? IconNode : null}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, arkVariants as buttonVariants, paddingFor }
