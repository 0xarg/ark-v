"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { landingAssets } from "@/components/landing/assets";

const TILES: {
  src: string;
  centerOffset: number;
  top: number;
  w: number;
  h: number;
}[] = [
  {
    src: landingAssets.portfolio1,
    centerOffset: -619.5,
    top: 225.56,
    w: 383,
    h: 273.975,
  },
  {
    src: landingAssets.portfolio2,
    centerOffset: -619.5,
    top: 529.54,
    w: 383,
    h: 273.975,
  },
  {
    src: landingAssets.portfolio3,
    centerOffset: -206.5,
    top: 333.98,
    w: 383,
    h: 273.975,
  },
  {
    src: landingAssets.portfolio4,
    centerOffset: -206.5,
    top: 637.95,
    w: 383,
    h: 273.975,
  },
  {
    src: landingAssets.portfolio5,
    centerOffset: 206.5,
    top: 333.98,
    w: 383,
    h: 273.975,
  },
  {
    src: landingAssets.portfolio6,
    centerOffset: 206.5,
    top: 637.95,
    w: 383,
    h: 273.975,
  },
  {
    src: landingAssets.portfolio7,
    centerOffset: 619.5,
    top: 225.56,
    w: 383,
    h: 273.975,
  },
  {
    src: landingAssets.portfolio8,
    centerOffset: 1032.5,
    top: 0,
    w: 383,
    h: 303.975,
  },
  {
    src: landingAssets.portfolio9,
    centerOffset: -1032.5,
    top: 0,
    w: 383,
    h: 293.975,
  },
  {
    src: landingAssets.portfolio10,
    centerOffset: 619.5,
    top: 529.54,
    w: 383,
    h: 287.25,
  },
  {
    src: landingAssets.portfolio11,
    centerOffset: 1032.5,
    top: 333.98,
    w: 383,
    h: 303.975,
  },
  {
    src: landingAssets.portfolio12,
    centerOffset: 1032.5,
    top: 667.95,
    w: 383,
    h: 303.975,
  },
  {
    src: landingAssets.portfolio2,
    centerOffset: -1032.5,
    top: 647.95,
    w: 383,
    h: 293.975,
  },
  {
    src: landingAssets.portfolio8,
    centerOffset: -1032.5,
    top: 323.98,
    w: 383,
    h: 293.975,
  },
];

/**
 * Figma: `1021:8437`–`1021:8444` — dark band above portfolio (`1021:8365`).
 */
export function LandingSectionWaitlist({
  title = " Get Early Access to Your Creative Team",
  subtitle = "Join the waitlist to secure founding member pricing and priority onboarding.",
  ctaLabel = "Join Waitlist",
}: {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
} = {}) {
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "-20px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="waitlist"
      className="relative z-0 overflow-hidden bg-[#0F1012] pb-10 pt-16 text-white sm:pt-24"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-[560px] h-[686px] w-[1846px] -translate-x-1/2 rounded-[385px] bg-[#FF0000] opacity-25 blur-[105px]"
        aria-hidden
      />

      <div className="landing-shell relative z-20 max-w-[1920px]">
        <div ref={headingRef} className="ark-reveal">
          <h2 className="mx-auto max-w-[816px] text-center font-(--font-ark-display) text-[clamp(2rem,4.5vw,86px)] leading-[1.1] tracking-[-0.01em]">
            {title}
          </h2>
          <p className="landing-subtitle mx-auto mt-4 max-w-[900px] text-center text-[#D0D0D0]">
            {subtitle}
          </p>
        </div>

        <div className="mt-8 flex justify-center sm:mt-10">
          <Link
            href="/waitlist"
            className="landing-pill-btn h-[52px] w-full max-w-[360px] border-ark-red-600 bg-ark-red-600 px-6 text-white shadow-[0px_0px_30px_rgba(255,0,0,0.55)] sm:h-[58px] sm:min-w-[230px] sm:w-auto sm:px-8"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>

      <div
        className="relative z-10 mt-12 hidden h-[720px] sm:-mt-[268px] sm:block"
        aria-label="Selected work"
      >
        <div className="absolute left-1/2 top-0 h-[972px] w-[1920px] -translate-x-1/2">
          {TILES.map((tile, i) => (
            <img
              key={i}
              alt=""
              src={tile.src}
              loading="eager"
              decoding="async"
              className="absolute rounded-[30px] object-cover"
              style={{
                left: `calc(50% + ${tile.centerOffset}px)`,
                transform: "translateX(-50%)",
                top: tile.top,
                width: tile.w,
                height: tile.h,
                transition: "transform 220ms cubic-bezier(0.23,1,0.32,1), filter 220ms cubic-bezier(0.23,1,0.32,1)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.transform = `translateX(-50%) scale(1.03)`;
                el.style.filter = "brightness(1.08)";
                el.style.zIndex = "5";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.transform = "translateX(-50%)";
                el.style.filter = "brightness(1)";
                el.style.zIndex = "";
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
