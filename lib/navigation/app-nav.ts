import type { LucideIcon } from "lucide-react"
import {
  ClipboardList,
  CreditCard,
  FolderOpen,
  LayoutDashboard,
  Send,
  Settings,
  Users,
  BarChart2,
} from "lucide-react"

export type AppNavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** Only show for client app role */
  clientOnly?: boolean
  /** When pathname doesn't equal href (e.g. nested request activity) */
  isActive?: (pathname: string) => boolean
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My Requests",
    href: "/my-requests",
    icon: ClipboardList,
    isActive: (pathname) =>
      pathname === "/my-requests" || /^\/requests\/[^/]+\//.test(pathname),
  },
  {
    label: "Submit Request",
    href: "/submit-request",
    icon: Send,
    clientOnly: true,
  },
  {
    label: "Team",
    href: "/team",
    icon: Users,
  },
  {
    label: "Usage",
    href: "/usage",
    icon: BarChart2,
  },
  {
    label: "Billing",
    href: "/subscription",
    icon: CreditCard,
    isActive: (pathname) =>
      pathname === "/subscription" || pathname === "/billing",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    label: "Brand Assets",
    href: "/brand-asset-library",
    icon: FolderOpen,
  },
]

export function navItemsForRole(appRole: "client" | "team" | "admin" | null): AppNavItem[] {
  if (appRole != null && appRole !== "client") {
    return APP_NAV_ITEMS.filter((i) => !i.clientOnly)
  }
  return APP_NAV_ITEMS
}

export function isNavItemActive(item: AppNavItem, pathname: string): boolean {
  if (item.isActive?.(pathname)) return true
  if (pathname === item.href) return true
  return false
}
