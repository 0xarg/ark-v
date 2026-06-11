"use client"

type SubscriptionSidebarCardProps = {
  planLabel: string
  activeConcurrency: number
  maxActiveRequests: number
  loading?: boolean
  onUpgrade: () => void
}

export function SubscriptionSidebarCard({
  planLabel,
  activeConcurrency,
  maxActiveRequests,
  loading,
  onUpgrade,
}: SubscriptionSidebarCardProps) {
  const maxLabel =
    maxActiveRequests > 0 ? String(maxActiveRequests) : "Unlimited"

  return (
    <div className="rounded-2xl bg-[rgba(255,0,0,0.05)] p-3 dark:bg-[#2A1C20]">
      <p className="text-[14px] text-ark-red-500">Subscription</p>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <p className="font-display text-[26px] leading-7 text-ark-red-500">
          {loading ? "…" : planLabel}
        </p>
        <span className="shrink-0 rounded-full border border-white bg-[#2F3744] px-2 py-0.5 text-[11px] text-white dark:border-[#2F3744] dark:bg-[#1A1E25]">
          Active
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-5 text-black dark:text-[#EAEBEC]">
        Usage:
        <br />
        {loading ? "…" : `${activeConcurrency} active requests at a time / ${maxLabel}`}
      </p>
      <button
        type="button"
        onClick={onUpgrade}
        className="mt-3 h-[36px] w-full cursor-pointer rounded-full bg-[#FFE4E4] text-[14px] font-medium text-[#2F3744] transition-colors hover:bg-[#FFD4D4] dark:bg-[#3A2228] dark:text-[#EAEBEC] dark:hover:bg-[#4A2A31]"
      >
        Manage Plan
      </button>
    </div>
  )
}
