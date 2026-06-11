"use client"

import Link from "next/link"
import * as React from "react"

import { cn } from "@/lib/utils"

export type CalendarRequestItem = {
  id: string
  title: string
  createdAtIso: string | null
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

export function RequestCalendarGrid({ items }: { items: CalendarRequestItem[] }) {
  const now = React.useMemo(() => new Date(), [])
  const year = now.getFullYear()
  const month = now.getMonth()

  const { startPad, daysInMonth, byDay } = React.useMemo(() => {
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const map = new Map<number, CalendarRequestItem[]>()
    for (const it of items) {
      if (!it.createdAtIso) continue
      const d = new Date(it.createdAtIso)
      if (Number.isNaN(d.getTime())) continue
      if (d.getFullYear() !== year || d.getMonth() !== month) continue
      const day = d.getDate()
      const prev = map.get(day) ?? []
      prev.push(it)
      map.set(day, prev)
    }
    return {
      startPad: first.getDay(),
      daysInMonth: last.getDate(),
      byDay: map,
    }
  }, [items, year, month])

  const title = now.toLocaleString("en-GB", { month: "long", year: "numeric" })

  const cells: React.ReactNode[] = []
  for (let i = 0; i < startPad; i++) {
    cells.push(<div key={`pad-${i}`} className="min-h-[72px] rounded-lg bg-[#FAFAFA]" />)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayItems = byDay.get(day) ?? []
    cells.push(
      <div
        key={day}
        className="flex min-h-[72px] flex-col gap-1 rounded-lg border border-[#ECECEC] bg-white p-1.5"
      >
        <span className="text-[11px] font-semibold text-[#888]">{day}</span>
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {dayItems.slice(0, 3).map((it) => (
            <Link
              key={it.id}
              href={`/requests/${it.id}/activity`}
              className={cn(
                "truncate rounded-md bg-[rgba(80,140,240,0.12)] px-1 py-0.5 text-[10px] font-medium text-[#508CF0]",
                "cursor-pointer hover:bg-[rgba(80,140,240,0.2)]"
              )}
              title={it.title}
            >
              {it.title}
            </Link>
          ))}
          {dayItems.length > 3 ? (
            <span className="text-[10px] text-[#999]">+{dayItems.length - 3} more</span>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <p className="mb-3 text-center font-display text-[18px] text-[#1E1E1E]">{title}</p>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-[#666]"
          >
            {d}
          </div>
        ))}
        {cells}
      </div>
      {items.filter((i) => i.createdAtIso).length === 0 ? (
        <p className="mt-4 text-center text-[14px] text-[#919191]">
          No dated requests to show in this month. Submit a request or switch to List view.
        </p>
      ) : null}
    </div>
  )
}
