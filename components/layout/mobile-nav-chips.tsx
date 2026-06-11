"use client"

import type { AppNavItem } from "@/lib/navigation/app-nav"

type MobileNavChipsProps = {
  items: AppNavItem[]
  onLogout: () => void | Promise<void>
}

export function MobileNavChips({ items, onLogout }: MobileNavChipsProps) {
  void items
  void onLogout
  return null
}
