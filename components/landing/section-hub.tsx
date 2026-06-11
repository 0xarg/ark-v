"use client";

import { useEffect, useRef } from "react";
import { landingAssets } from "@/components/landing/assets";
import { HubJoinWaitlistCta } from "@/components/landing/ctas";

/**
 * Figma: `1021:7296` light band, stripes `1021:7297`, title `1021:7381`, sub `1021:7386`,
 * screenshot grid `1021:7413`, MacBook `1021:7425`–`1021:7426`, CTA `1021:7427`.
 */
export function LandingSectionHub() {
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "-20px 0px" },
    );

    if (headingRef.current) observer.observe(headingRef.current);

    return () => observer.disconnect();
  }, []);

  const rowA = [
    landingAssets.hubShot163,
    landingAssets.hubShot158,
    landingAssets.hubShot164,
    landingAssets.hubShot166,
    landingAssets.hubShot167,
    landingAssets.hubShot168,
  ];
  const rowB = [
    landingAssets.hubShot165,
    landingAssets.hubShot164,
    landingAssets.hubShot160,
    landingAssets.hubShot166,
    landingAssets.hubShot167,
    landingAssets.hubShot168,
  ];

  return (
    <section id="hub" className="relative overflow-x-hidden bg-white">
      <div className="relative bg-[#0F1012] pb-28 pt-16 sm:pb-[210px] sm:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[650px] sm:h-[870px] opacity-[0.35]">
          <div className="relative mx-auto h-full w-[1920px] max-w-none">
            {Array.from({ length: 18 }).map((_, idx) => (
              <div
                key={`hub-stripe-${idx}`}
                className="absolute top-0 h-full w-[106px]"
                style={{ left: 5 + idx * 106 }}
              >
                <img
                  alt=""
                  src={landingAssets.stripeColumn}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_88%_88%_at_50%_84%,rgba(232,0,0,0.24),transparent_72%)]" />

        <div ref={headingRef} className="landing-shell relative ark-reveal">
          <h2 className="landing-h2 text-center text-white">
            Your Creative Team — All in One Place
          </h2>
          <p className="landing-subtitle mx-auto mt-4 max-w-[850px] text-center text-white/80">
            Submit requests, track progress, and get high-quality creative work
            delivered without managing a team.
          </p>
        </div>

        <div className="relative mt-8 space-y-4 overflow-hidden sm:mt-10 sm:space-y-5">
          <div className="hub-row-wrapper">
            <div className="hub-row-left flex items-center gap-5">
              {[...rowA, ...rowA].map((src, i) => (
                <img
                  key={`hub-row-a-${i}`}
                  alt=""
                  src={src}
                  loading="eager"
                  decoding="async"
                  className="hub-shot-img h-[150px] w-[236px] shrink-0 rounded-[9px] border border-white/30 object-cover sm:h-[212px] sm:w-[334px]"
                />
              ))}
            </div>
          </div>
          <div className="hub-row-wrapper">
            <div className="hub-row-right flex items-center gap-5">
              {[...rowB, ...rowB].map((src, i) => (
                <img
                  key={`hub-row-b-${i}`}
                  alt=""
                  src={src}
                  loading="eager"
                  decoding="async"
                  className="hub-shot-img h-[150px] w-[236px] shrink-0 rounded-[9px] border border-white/30 object-cover sm:h-[212px] sm:w-[334px]"
                />
              ))}
            </div>
          </div>
        </div>

        <img
          alt="ARKHV product preview on MacBook"
          src={landingAssets.macbook}
          className="pointer-events-none absolute left-1/2 -bottom-[90px] sm:-bottom-[160px] z-4 w-[883px] max-w-[94vw] -translate-x-1/2 sm:-bottom-[210px] sm:max-w-[90vw]"
          style={{ imageRendering: "auto" }}
        />
      </div>

      {/* light wash area below the dark section — MacBook overlaps from above */}
      <div className="relative overflow-hidden pb-12 pt-[92px] sm:pb-14 sm:pt-[150px]">
        <div className="pointer-events-none absolute inset-0 z-0">
          <img
            alt=""
            src={landingAssets.bgWashLower}
            className="h-full w-full object-cover opacity-[0.3]"
          />
        </div>
        <div className="relative z-10 flex justify-center">
          <HubJoinWaitlistCta href="/waitlist">
            Join the Waitlist
          </HubJoinWaitlistCta>
        </div>
      </div>
    </section>
  );
}
