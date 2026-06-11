"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { landingAssets } from "@/components/landing/assets";
import { ArkhvLogo } from "@/components/brand/arkhv-logo";
import { PrimaryCta, SecondaryCta } from "@/components/landing/ctas";

const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
const appAuthHref =
  appOrigin && /^https?:\/\//i.test(appOrigin) ? `${appOrigin}/auth` : "/auth";

/**
 * Figma: hero stack — `1021:7319` (bg), `1021:7320` stripes, nav `1021:7371`–`1021:7367`,
 * headline `1021:7378`, sub `1021:7379`, CTAs `1021:7368`, product `1021:8140`, glow `1021:7339`/`1021:7340`, glass `1021:7384`–`1021:7382`.
 * Announcement bar is a sibling section (`1021:7343` + `1021:7352`), not inside this frame.
 */
export function LandingSectionHero() {
  const navRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);

  const [stackHovered, setStackHovered] = useState(false);

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 150, damping: 25, mass: 0.5 });
  const rotateY = useSpring(tiltY, { stiffness: 150, damping: 25, mass: 0.5 });

  const handleTiltMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = tiltRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    tiltX.set(y * -3.5);
    tiltY.set(x * 3.5);
  };

  const handleTiltLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
    setStackHovered(false);
  };

  useEffect(() => {
    const els = [
      { el: navRef.current, delay: 0 },
      { el: headlineRef.current, delay: 100 },
      { el: subtitleRef.current, delay: 180 },
      { el: ctaRef.current, delay: 260 },
      { el: productRef.current, delay: 380 },
    ];

    const timers = els.map(({ el, delay }) => {
      if (!el) return null;
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = `opacity 600ms cubic-bezier(0.23,1,0.32,1) ${delay}ms, transform 600ms cubic-bezier(0.23,1,0.32,1) ${delay}ms`;
      return setTimeout(() => {
        if (!el) return;
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, 20);
    });

    return () => timers.forEach((t) => t && clearTimeout(t));
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#0F1012] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[1400px]">
          <div className="relative mx-auto h-full w-[1920px] max-w-none">
            {Array.from({ length: 18 }).map((_, idx) => (
              <div
                key={`stripe-${idx}`}
                className="absolute top-0 h-full w-[106px]"
                style={{ left: 5 + idx * 106 }}
              >
                <img
                  alt=""
                  src={landingAssets.stripeColumn}
                  className="h-full w-full object-cover backdrop-blur-[50px]"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-y-0 left-0 w-[260px] bg-linear-to-r from-[#0F1012] to-transparent" />
        <div className="absolute inset-y-0 right-0 w-[260px] bg-linear-to-l from-[#0F1012] to-transparent" />
        <div className="absolute left-1/2 top-[62%] h-[540px] w-[1340px] -translate-x-1/2 rounded-[999px] bg-[#E80000]/30 blur-[140px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1920px]">
        <div
          ref={navRef}
          className="landing-shell flex items-center justify-between gap-3 pt-4 sm:pt-6"
        >
          <Link href="/" className="landing-link shrink-0">
            <ArkhvLogo
              variant="wordmark-light"
              className="h-5 w-28 sm:h-6 sm:w-32"
            />
          </Link>

          <nav
            aria-label="Primary"
            className="hidden items-center rounded-full border border-white/20 bg-white/3 p-1 md:flex"
          >
            <Link
              href="#features"
              className="landing-link rounded-full bg-ark-red-600 px-4 py-2 text-sm font-medium text-white shadow-[0px_0px_18px_#ff0000]"
            >
              Services
            </Link>
            <Link
              href="#waitlist"
              className="landing-nav-link rounded-full px-4 py-2"
            >
              Our Work
            </Link>
            <Link
              href="#why"
              className="landing-nav-link rounded-full px-4 py-2"
            >
              Why us
            </Link>
            <Link
              href="#waitlist"
              className="landing-nav-link rounded-full px-4 py-2"
            >
              Resources
            </Link>
            <Link
              href="#pricing"
              className="landing-nav-link rounded-full px-4 py-2"
            >
              Pricing
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/waitlist"
              className="landing-pill-btn h-10 border-white/30 bg-transparent px-3 text-xs text-white/90 sm:h-11 sm:px-5 sm:text-sm"
            >
              Book a demo
            </Link>
            <Link
              href={appAuthHref}
              className="landing-pill-btn landing-pill-btn-secondary-dark h-10 px-3 text-xs sm:h-11 sm:px-5 sm:text-sm"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="landing-shell pt-16 sm:pt-24">
          <h1
            ref={headlineRef}
            className="mx-auto max-w-[980px] text-center font-(--font-ark-display) text-[clamp(2.65rem,5vw,4.75rem)] leading-[1.05] text-white"
          >
            One Subscription for Your Entire Creative Team
          </h1>
          <p
            ref={subtitleRef}
            className="landing-subtitle mx-auto tracking-wide mt-4 max-w-[560px] text-center text-white/90"
          >
            ARKHV replaces the need to hire designers, motion artists, and
            creatives — with one streamlined, on-demand service.
          </p>

          <div
            ref={ctaRef}
            className="mt-8 mx-auto flex w-full flex-col items-center justify-center gap-3 px-4 sm:px-0 md:flex-row"
          >
            <PrimaryCta href="/waitlist">Join the Waitlist</PrimaryCta>
            <SecondaryCta href="#hub">See How It Works</SecondaryCta>
          </div>

          <div
            ref={productRef}
            className="relative mx-auto mt-12 w-full max-w-[1080px] sm:mt-[148px]"
          >
            {/* Glow blurs — stay outside tilt so they don't rotate */}
            <div className="absolute inset-x-0 -top-[20px] mx-auto h-[280px] w-full max-w-[1026px] rounded-[999px] bg-[#E80000]/35 blur-[90px] sm:h-[440px] sm:blur-[120px]" />
            <div className="absolute inset-x-0 top-[14px] mx-auto h-[320px] w-full max-w-[1326px] rounded-[999px] bg-white/8 blur-[55px] sm:h-[487px] sm:blur-[70px]" />

            {/* 3D tilt container */}
            <div style={{ perspective: "1400px" }}>
              <motion.div
                ref={tiltRef}
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                onMouseMove={handleTiltMove}
                onMouseEnter={() => setStackHovered(true)}
                onMouseLeave={handleTiltLeave}
                className="relative"
              >
                {/* Stack card 1 — bottom, spreads most */}
                <motion.div
                  className="absolute inset-x-0 top-[-30px] mx-auto hidden h-[420px] w-[78%] rounded-[22px] bg-white/6 sm:block"
                  animate={{ y: stackHovered ? 12 : 0 }}
                  transition={{ type: "spring", stiffness: 150, damping: 25 }}
                  style={{ zIndex: 1 }}
                />
                {/* Stack card 2 — middle */}
                <motion.div
                  className="absolute inset-x-0 top-[-20px] mx-auto hidden h-[440px] w-[86%] rounded-[22px] bg-white/7 sm:block"
                  animate={{ y: stackHovered ? 6 : 0 }}
                  transition={{ type: "spring", stiffness: 150, damping: 25 }}
                  style={{ zIndex: 2 }}
                />
                {/* Stack card 3 — closest to screenshot */}
                <motion.div
                  className="absolute inset-x-0 top-[-10px] mx-auto hidden h-[470px] w-[95%] rounded-[22px] bg-white/8 sm:block"
                  animate={{ y: stackHovered ? 2 : 0 }}
                  transition={{ type: "spring", stiffness: 150, damping: 25 }}
                  style={{ zIndex: 3 }}
                />

                <div className="relative z-4 overflow-hidden rounded-t-[18px] sm:rounded-t-[30px]">
                  <img
                    alt="ARKHV dashboard"
                    src="/landing/hero.png"
                    className="block h-auto w-full object-cover"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
