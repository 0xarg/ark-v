"use client"

import * as React from "react"
import { Select } from "radix-ui"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const triggerCn = cn(
  "flex h-[51px] w-full min-w-[min(100%,320px)] items-center justify-between gap-3 rounded-full border border-[#d9d9d9] bg-white px-[26px] py-[14px] text-left text-[14px] font-normal leading-normal text-black outline-none transition-shadow font-sans",
  "hover:bg-[#fcfcfc]",
  "focus:border-[#2f3744] focus:shadow-[0px_3px_14px_0px_rgba(47,55,68,0.1)]",
  "disabled:cursor-not-allowed disabled:opacity-40",
  "dark:border-[#eaebec] dark:bg-[#2f3744] dark:text-white dark:hover:bg-[#2f3744]",
  "dark:focus:border-[#eaebec] dark:focus:shadow-[0px_3px_34px_0px_rgba(0,0,0,0.3)]"
)

const contentCn = cn(
  "z-50 max-h-[min(320px,var(--radix-select-content-available-height))] overflow-y-auto rounded-[20px] border border-[#2f3744] bg-white p-2.5 shadow-lg",
  "dark:border-[#eaebec] dark:bg-[#444b57]"
)

const itemCn = cn(
  "relative flex h-[51px] w-full cursor-pointer select-none items-center rounded-[14px] pl-10 pr-[17px] text-[14px] text-[#252527] outline-none font-sans",
  "data-[highlighted]:bg-[#f7f7f7] data-[state=checked]:bg-[#f7f7f7]",
  "dark:text-white dark:data-[highlighted]:bg-[#545b67] dark:data-[state=checked]:bg-[#545b67]"
)

export type DropdownOption = { value: string; label: string }

export function DropdownSelect({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "Option",
  disabled,
  className,
  name,
  required,
}: {
  value?: string
  defaultValue?: string
  onValueChange?(v: string): void
  options: DropdownOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  name?: string
  required?: boolean
}) {
  return (
    <Select.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      name={name}
      required={required}
    >
      <Select.Trigger className={cn(triggerCn, className)} aria-label={placeholder}>
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDown className="size-6 shrink-0 text-current opacity-80" strokeWidth={1.5} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={8}
          className={contentCn}
          style={{ width: "var(--radix-select-trigger-width)" }}
        >
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item key={o.value} value={o.value} className={itemCn}>
                <span className="absolute left-3 flex size-4 items-center justify-center">
                  <Select.ItemIndicator>
                    <Check
                      className="size-4 text-ark-red-500"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </Select.ItemIndicator>
                </span>
                <Select.ItemText>{o.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

export { Select as DropdownSelectPrimitives, triggerCn as dropdownSelectTriggerClass, itemCn as dropdownSelectItemClass }
