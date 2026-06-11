"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"

export function CustomNotFound({
  title = "Page not found",
  description = "This section is not available yet.",
}: {
  title?: string
  description?: string
}) {
  const pathname = usePathname()

  return (
    <main className="grid min-h-screen place-items-center bg-[#FCFCFC] p-6">
      <section className="w-full max-w-xl rounded-2xl border border-[#E0E0E0] bg-white p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#7A7A7A]">
          404
        </p>
        <h1 className="mt-2 font-display text-[38px] leading-none text-[#1E1E1E]">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] text-[#5D5D5D]">
          {description}
        </p>
        <p className="mt-2 text-[13px] text-[#8A8A8A]">Route: {pathname}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/dashboard">
            <Button type="button" size="sm">
              Back to dashboard
            </Button>
          </Link>
          <Link href="/">
            <Button type="button" size="sm" variant="secondary">
              Home
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
