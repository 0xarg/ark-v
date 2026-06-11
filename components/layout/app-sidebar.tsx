"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";

import { ArkhvLogo } from "@/components/brand/arkhv-logo";
import { isNavItemActive, type AppNavItem } from "@/lib/navigation/app-nav";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

type AppSidebarProps = {
  items: AppNavItem[];
  subscriptionCard: React.ReactNode;
  onLogout: () => void | Promise<void>;
};

export function AppSidebar({
  items,
  subscriptionCard,
  onLogout,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { theme } = useTheme();
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={() => setMobileOpen(true)}
        className={cn(
          "fixed right-3 top-3 z-40 grid size-[42px] place-items-center rounded-full border border-[#E6E6E6] bg-white text-[#4A4A4A] shadow-[0px_8px_16px_0px_rgba(0,0,0,0.06)] transition-colors hover:bg-[#F6F6F6] dark:border-[#2F3744] dark:bg-[#1A1E25] dark:text-[#EAEBEC] xl:hidden",
          mobileOpen ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        <Menu className="size-5" />
      </button>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 xl:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-black/15 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute bottom-3 left-3 top-3 flex w-[min(274px,calc(100vw-88px))] flex-col overflow-y-auto rounded-[20px] border-[1.5px] border-[#E0E0E0] bg-white p-3 dark:border-[#2A3444] dark:bg-[#141C27]">
            <div className="px-1 pt-0.5">
              <Link href="/dashboard" className="inline-block">
                <ArkhvLogo
                  variant="wordmark-default"
                  className="h-6 w-auto max-w-[132px]"
                />
              </Link>
            </div>

            <nav
              className="mt-4 space-y-1 text-[14px] font-medium leading-5"
              aria-label="Main"
            >
              {items.map((item) => {
                const active = isNavItemActive(item, pathname);
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded-[28px] px-3 py-2 text-left transition-colors",
                      active
                        ? "bg-[#2F3744] text-white dark:bg-[#2B323E]"
                        : "text-[#666] hover:bg-[#F5F5F5] dark:text-[#BFC1C5] dark:hover:bg-[#1A1E25]",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon
                        className={cn(
                          "size-5 shrink-0",
                          active
                            ? "text-white"
                            : "text-[#777] dark:text-[#9FA3A9]",
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {!active ? (
                      <ArrowRight
                        className="size-3.5 shrink-0 text-[#B0B0B0] dark:text-[#747982]"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                );
              })}
            </nav>

            <div className="mt-6">{subscriptionCard}</div>

            <div className="mt-auto flex flex-col space-y-1.5 pt-6">
              <button
                type="button"
                onClick={() => router.push("/settings")}
                className="flex w-full cursor-pointer items-center justify-between rounded-[28px] px-3 py-2 text-left text-[14px] text-[#666] transition-colors hover:bg-[#F5F5F5] dark:text-[#BFC1C5] dark:hover:bg-[#1A1E25]"
              >
                <span>Help Center</span>
                <ArrowRight className="size-3.5 text-[#666] dark:text-[#BFC1C5]" />
              </button>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center justify-between rounded-[28px] bg-[rgba(255,0,0,0.05)] px-3 py-2 text-left text-[14px] text-ark-red-500 transition-colors hover:bg-[rgba(255,0,0,0.08)] dark:bg-[#2A1C20] dark:hover:bg-[#352126]"
                onClick={() => void onLogout()}
              >
                <span>Logout</span>
                <ArrowRight className="size-3.5 text-ark-red-500" />
              </button>
            </div>
          </aside>

          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
            className="absolute right-5 top-5 grid size-[42px] place-items-center rounded-full bg-white text-[#2F3744] shadow-[0px_8px_14px_0px_rgba(255,0,0,0.1)]"
          >
            <X className="size-5" />
          </button>
        </div>
      ) : null}

      <aside
        className={cn(
          "sticky top-3 hidden h-[calc(100dvh-24px)] w-[238px] shrink-0 self-start flex-col overflow-y-auto overscroll-contain rounded-2xl border border-[#E0E0E0] bg-white p-2.5 sm:p-3 dark:border-[#2A3444] dark:bg-[#141C27] xl:flex xl:w-[248px]",
        )}
      >
        <div className="px-1 pt-0.5">
          <Link href="/dashboard" className="inline-block">
            <ArkhvLogo
              variant={theme === "dark" ? "wordmark-light" : "wordmark-default"}
              className="h-6 w-auto max-w-[132px]"
            />
          </Link>
        </div>

        <nav
          className="mt-4 space-y-1 text-[13px] font-medium leading-5 sm:text-[14px]"
          aria-label="Main"
        >
          {items.map((item) => {
            const active = isNavItemActive(item, pathname);
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between rounded-[28px] px-2.5 py-2 text-left transition-colors sm:px-3",
                  active
                    ? "bg-[#2F3744] text-white dark:bg-[#2B323E]"
                    : "text-[#666] hover:bg-[#F5F5F5] dark:text-[#BFC1C5] dark:hover:bg-[#1A1E25]",
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Icon
                    className={cn(
                      "size-[18px] shrink-0 sm:size-5",
                      active ? "text-white" : "text-[#777] dark:text-[#9FA3A9]",
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <ArrowRight
                  className={cn(
                    "size-3 shrink-0 sm:size-3.5",
                    active
                      ? "text-white/85"
                      : "text-[#B0B0B0] dark:text-[#747982]",
                  )}
                  aria-hidden
                />
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col space-y-2 pt-5">
          {subscriptionCard}
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="flex w-full cursor-pointer items-center justify-between rounded-[28px] bg-[rgba(255,0,0,0.05)] px-3 py-2 text-left text-[14px] text-[#666] transition-colors hover:bg-[rgba(255,0,0,0.08)] dark:bg-[#2A1C20] dark:text-[#BFC1C5] dark:hover:bg-[#352126]"
          >
            <span>Support</span>
            <ArrowRight className="size-3.5 text-[#666] dark:text-[#BFC1C5]" />
          </button>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between rounded-[28px] bg-[rgba(255,0,0,0.05)] px-3 py-2 text-left text-[14px] text-ark-red-500 transition-colors hover:bg-[rgba(255,0,0,0.08)] dark:bg-[#2A1C20] dark:hover:bg-[#352126]"
            onClick={() => void onLogout()}
          >
            <span>Logout</span>
            <ArrowRight className="size-3.5 text-ark-red-500" />
          </button>
        </div>
      </aside>
    </>
  );
}
