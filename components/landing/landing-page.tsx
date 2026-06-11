import { LandingSectionAnnouncement } from "@/components/landing/section-announcement";
import { LandingSectionFeatures } from "@/components/landing/section-features";
import { LandingSectionFooter } from "@/components/landing/section-footer";
import { LandingSectionHero } from "@/components/landing/section-hero";
import { LandingSectionHub } from "@/components/landing/section-hub";
import { LandingSectionPricing } from "@/components/landing/section-pricing";
import { LandingSectionStruggle } from "@/components/landing/section-struggle";
import { LandingSectionWaitlist } from "@/components/landing/section-waitlist";
import { CursorGlow } from "@/components/landing/cursor-glow";
import { landingAssets } from "@/components/landing/assets";

/** Figma landing root `1021:7292` — section order matches file structure. */
export function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <CursorGlow />
      <LandingSectionAnnouncement />
      <LandingSectionHero />
      <div className="relative overflow-hidden bg-white">
        <img
          alt=""
          src={landingAssets.bgWashMid}
          className="pointer-events-none absolute left-1/2 top-[-80px] h-[1439px] w-[2558px] max-w-none -translate-x-1/2 object-cover opacity-[0.22]"
        />
        <LandingSectionStruggle />
        <LandingSectionFeatures />
      </div>
      <LandingSectionHub />
      <LandingSectionPricing />
      <LandingSectionWaitlist />
      <LandingSectionFooter />
    </main>
  );
}
