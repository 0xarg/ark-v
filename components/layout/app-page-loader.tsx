"use client";

/* eslint-disable @next/next/no-img-element -- Figma-provided external illustration asset. */

import { ArkhvLogo } from "@/components/brand/arkhv-logo";
import { cn } from "@/lib/utils";

const SHELL_ERROR_ILLUSTRATION = "/app/shell-error.png";

export type AppPageLoaderProps = {
  /** `full` — centered block. `inline` — compact block. `shell` — app-shell page skeleton. `shell-error` — app-shell error state. */
  variant?: "full" | "inline" | "shell" | "shell-error";
  className?: string;
  onRetry?: () => void;
  errorTitle?: string;
  errorMessage?: string;
  retryLabel?: string;
};

export function AppPageLoader({
  variant = "full",
  className,
  onRetry,
  errorTitle = "Something went wrong",
  errorMessage = "We couldn't load your dashboard data. Please try again.",
  retryLabel = "Retry",
}: AppPageLoaderProps) {
  if (variant === "shell") {
    return (
      <div
        className={cn(
          "min-h-screen bg-background p-3 sm:p-4 lg:p-[18px]",
          className,
        )}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="mx-auto flex w-full max-w-[min(100%,2200px)] gap-3 sm:gap-4 xl:gap-[18px]">
          <aside className="hidden h-[880px] w-[248px] shrink-0 rounded-2xl border border-[#E0E0E0] bg-white p-3 dark:border-[#2A3444] dark:bg-[#141C27] xl:block">
            <div className="h-[23px] w-[120px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
            <div className="mt-10 space-y-2.5">
              <div className="h-9 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
              <div className="h-9 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
              <div className="h-9 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
              <div className="h-9 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
              <div className="h-9 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
            </div>
            <div className="mt-[322px] h-[173px] rounded-2xl bg-[#F1F2F4] dark:bg-[#2A3444]" />
            <div className="mt-8 space-y-2.5">
              <div className="h-9 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
              <div className="h-9 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
            </div>
          </aside>

          <main className="w-full min-w-0 flex-1 space-y-3 sm:space-y-4">
            <div className="h-[62px] rounded-2xl border border-[#E0E0E0] bg-white px-5 py-[10px] dark:border-[#2A3444] dark:bg-[#141C27]">
              <div className="flex h-full items-center gap-2.5">
                <div className="h-[23px] w-[120px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
                <div className="hidden h-[42px] min-w-0 flex-1 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444] lg:block" />
                <div className="hidden h-[42px] w-[112px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444] lg:block" />
                <div className="size-[42px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
                <div className="size-[42px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
                <div className="size-[42px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
              </div>
            </div>

            <section className="min-h-[800px] rounded-2xl border border-[#E0E0E0] bg-white p-5 dark:border-[#2A3444] dark:bg-[#141C27]">
              <div className="flex items-center justify-between gap-4">
                <div className="h-[23px] w-[120px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
                <div className="flex items-center gap-2">
                  <div className="h-[42px] w-[76px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
                  <div className="h-[42px] w-[112px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
                  <div className="size-[42px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
                  <div className="size-[42px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
                  <div className="size-[42px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
                </div>
              </div>

              <div className="mt-8 h-[44px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
              <div className="mt-5 h-[54px] rounded-xl bg-[#F1F2F4] dark:bg-[#2A3444]" />
              <div className="mt-2.5 h-[54px] rounded-xl bg-[#F1F2F4] dark:bg-[#2A3444]" />
              <div className="mt-2.5 h-[54px] rounded-xl bg-[#F1F2F4] dark:bg-[#2A3444]" />
              <div className="mt-2.5 h-[54px] rounded-xl bg-[#F1F2F4] dark:bg-[#2A3444]" />
              <div className="mt-2.5 h-[54px] rounded-xl bg-[#F1F2F4] dark:bg-[#2A3444]" />
            </section>
          </main>
        </div>
      </div>
    );
  }

  if (variant === "shell-error") {
    return (
      <div
        className={cn(
          "min-h-screen bg-background p-3 sm:p-4 lg:p-[18px]",
          className,
        )}
        role="alert"
        aria-live="assertive"
      >
        <div className="mx-auto flex w-full max-w-[min(100%,2200px)] gap-3 sm:gap-4 xl:gap-[18px]">
          <aside className="hidden h-[880px] w-[248px] shrink-0 rounded-2xl border border-[#E0E0E0] bg-white p-3 dark:border-[#2A3444] dark:bg-[#141C27] xl:block">
            <div className="h-[23px] w-[120px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
            <div className="mt-10 space-y-2.5">
              <div className="h-9 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
              <div className="h-9 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
              <div className="h-9 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
              <div className="h-9 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
              <div className="h-9 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
            </div>
            <div className="mt-[322px] h-[173px] rounded-2xl bg-[#F1F2F4] dark:bg-[#2A3444]" />
            <div className="mt-8 space-y-2.5">
              <div className="h-9 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
              <div className="h-9 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
            </div>
          </aside>

          <main className="w-full min-w-0 flex-1 space-y-3 sm:space-y-4">
            <div className="h-[62px] rounded-2xl border border-[#E0E0E0] bg-white px-5 py-[10px] dark:border-[#2A3444] dark:bg-[#141C27]">
              <div className="flex h-full items-center gap-2.5">
                <div className="h-[23px] w-[120px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
                <div className="hidden h-[42px] min-w-0 flex-1 rounded-full bg-[#F1F2F4] dark:bg-[#2A3444] lg:block" />
                <div className="hidden h-[42px] w-[112px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444] lg:block" />
                <div className="size-[42px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
                <div className="size-[42px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
                <div className="size-[42px] rounded-full bg-[#F1F2F4] dark:bg-[#2A3444]" />
              </div>
            </div>

            <section className="grid min-h-[800px] place-items-center rounded-2xl border border-[#E0E0E0] bg-white p-5 dark:border-[#2A3444] dark:bg-[#141C27]">
              <div className="flex max-w-[320px] flex-col items-center text-center">
                <img
                  src={SHELL_ERROR_ILLUSTRATION}
                  alt=""
                  className="h-[138px] w-auto"
                />
                <p className="mt-6 font-display text-[24px] leading-none text-[#1E1E1E] dark:text-white">
                  {errorTitle}
                </p>
                <p className="mt-3 max-w-[240px] text-[14px] font-medium leading-tight text-[#919191] dark:text-[#BFC1C5]">
                  {errorMessage}
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-8 inline-flex h-[42px] items-center justify-center rounded-full border border-ark-red-500 px-[34px] text-[14px] text-ark-red-500 shadow-[0px_10px_24px_0px_rgba(255,0,0,0.1)] transition-colors hover:bg-[rgba(255,0,0,0.03)]"
                >
                  {retryLabel}
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center bg-background",
        variant === "full" && "min-h-dvh w-full px-4",
        variant === "inline" && "min-h-[160px] w-full gap-3 py-10",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <ArkhvLogo variant="wordmark-default" className="h-8 w-40 sm:h-9" />
      <p className="mt-4 text-[15px] font-medium tracking-wide text-[#5A5A60] dark:text-[#BFC1C5]">
        Loading
      </p>
    </div>
  );
}
