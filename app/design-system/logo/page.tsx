import type { Metadata } from "next"

import { ArkhvLogo } from "@/components/brand/arkhv-logo"

export const metadata: Metadata = {
  title: "Logo | ARKHV Design System",
  description: "ARKHV logo variants — Figma frame 1:2",
}

export default function DesignSystemLogoPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-10 md:px-12 md:py-14 lg:px-[min(8vw,7.5rem)]">
      <h1 className="ark-ds-mega-title capitalize">Logo</h1>

      <p className="mt-4 max-w-2xl text-sm text-ark-muted-blue-grey md:text-base">
        Wordmarks and icon marks from the brand file. Use{" "}
        <code className="rounded bg-ark-light-grey px-1.5 py-0.5 font-mono text-xs text-ark-black">
          ArkhvLogo
        </code>{" "}
        with the appropriate variant for light, dark, or monochrome contexts.
      </p>

      <section className="mt-16 space-y-8">
        <h2 className="text-2xl font-semibold tracking-tight text-ark-black md:text-3xl">
          Wordmarks
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          <figure className="flex flex-col gap-4">
            <div className="flex min-h-[120px] items-center rounded-2xl border border-ark-blue-200 bg-white px-6 py-8">
              <ArkhvLogo
                variant="wordmark-default"
                className="h-8 w-auto md:h-9"
              />
            </div>
            <figcaption className="text-sm text-ark-muted-blue-grey">
              Primary — red icon and navy wordmark
            </figcaption>
          </figure>

          <figure className="flex flex-col gap-4">
            <div className="flex min-h-[120px] items-center justify-center rounded-[20px] bg-ark-dark-blue-grey px-6 py-8">
              <ArkhvLogo
                variant="wordmark-inverse"
                className="h-8 w-auto md:h-9"
              />
            </div>
            <figcaption className="text-sm text-ark-muted-blue-grey">
              On dark — full white on{" "}
              <span className="font-mono text-xs">#2F3744</span>
            </figcaption>
          </figure>

          <figure className="flex flex-col gap-4">
            <div className="flex min-h-[120px] items-center rounded-2xl border border-ark-blue-200 bg-white px-6 py-8">
              <ArkhvLogo variant="wordmark-mono" className="h-8 w-auto md:h-9" />
            </div>
            <figcaption className="text-sm text-ark-muted-blue-grey">
              Monochrome — navy icon and wordmark
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="mt-20 space-y-8">
        <h2 className="text-2xl font-semibold tracking-tight text-ark-black md:text-3xl">
          Icon marks
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          <figure className="flex flex-col gap-4">
            <div className="flex aspect-square min-h-[200px] items-center justify-center rounded-[20px] bg-ark-dark-blue-grey p-8">
              <ArkhvLogo variant="mark-white" className="h-28 w-auto md:h-32" />
            </div>
            <figcaption className="text-sm text-ark-muted-blue-grey">
              White mark on dark
            </figcaption>
          </figure>

          <figure className="flex flex-col gap-4">
            <div className="flex aspect-square min-h-[200px] items-center justify-center rounded-2xl border border-ark-blue-200 bg-white p-8">
              <ArkhvLogo variant="mark-red" className="h-28 w-auto md:h-32" />
            </div>
            <figcaption className="text-sm text-ark-muted-blue-grey">
              Brand red
            </figcaption>
          </figure>

          <figure className="flex flex-col gap-4">
            <div className="flex aspect-square min-h-[200px] items-center justify-center rounded-2xl border border-ark-blue-200 bg-white p-8">
              <ArkhvLogo variant="mark-navy" className="h-28 w-auto md:h-32" />
            </div>
            <figcaption className="text-sm text-ark-muted-blue-grey">
              Navy
            </figcaption>
          </figure>
        </div>
      </section>
    </main>
  )
}
