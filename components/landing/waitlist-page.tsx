"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useSpring,
} from "motion/react";

import { landingAssets } from "@/components/landing/assets";
import { CursorGlow } from "@/components/landing/cursor-glow";
import { LandingSectionFooter } from "@/components/landing/section-footer";
import { LandingSectionWaitlist } from "@/components/landing/section-waitlist";
import { WaitlistEmailForm } from "@/components/landing/waitlist-email-form";

const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
const appAuthHref =
  appOrigin && /^https?:\/\//i.test(appOrigin) ? `${appOrigin}/auth` : "/auth";

const WHAT_IS_ITEMS = [
  {
    title: "Structured Requests",
    body: "Submit design requests with clear briefs, files, and priorities.",
    icon: "/waitlist/icon-structured-requests.svg",
  },
  {
    title: "Real-Time Tracking",
    body: "Track request progress from submission to completion.",
    icon: "/waitlist/icon-realtime-tracking.svg",
  },
  {
    title: "Team Collaboration",
    body: "Manage team members and communicate in one place.",
    icon: "/waitlist/icon-team-collab.svg",
  },
] as const;

const SHOWCASE_ROW_A = [
  "/waitlist/showcase-a-1.png",
  "/waitlist/showcase-a-2.png",
  "/waitlist/showcase-a-3.png",
  "/waitlist/showcase-a-4.png",
  "/waitlist/showcase-a-5.png",
  "/waitlist/showcase-a-1.png",
] as const;

const SHOWCASE_ROW_B = [
  "/waitlist/showcase-b-1.png",
  "/waitlist/showcase-a-3.png",
  "/waitlist/showcase-b-3.png",
  "/waitlist/showcase-a-5.png",
  "/waitlist/showcase-b-5.png",
] as const;

const waitlistSuccessIcon = "/waitlist/success-icon.png";

function WhatIsCard({
  title,
  body,
  icon,
  revealDelay,
}: {
  title: string;
  body: string;
  icon: string;
  revealDelay: number;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const spotX = useMotionValue(-300);
  const spotY = useMotionValue(-300);

  const rotateX = useSpring(tiltX, { stiffness: 150, damping: 25, mass: 0.5 });
  const rotateY = useSpring(tiltY, { stiffness: 150, damping: 25, mass: 0.5 });
  const spotlight = useMotionTemplate`radial-gradient(260px circle at ${spotX}px ${spotY}px, rgba(255,60,0,0.18), transparent 70%)`;

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    el.style.animationDelay = `${revealDelay}ms`;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "-30px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [revealDelay]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    tiltX.set(y * -7);
    tiltY.set(x * 7);
    spotX.set(e.clientX - rect.left);
    spotY.set(e.clientY - rect.top);
  };

  const handleMouseLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
    spotX.set(-300);
    spotY.set(-300);
  };

  return (
    <div
      ref={outerRef}
      className="ark-reveal flex flex-col"
      style={{ perspective: "1000px" }}
    >
      <motion.div
        ref={cardRef}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ boxShadow: "0px 24px 60px rgba(255,0,0,0.35)" }}
        initial={{ boxShadow: "0px 14px 44px rgba(255,0,0,0.2)" }}
        transition={{ boxShadow: { duration: 0.2 } }}
        className="relative flex-1 overflow-hidden rounded-[20px] bg-[#2F3744] px-5 pb-8 pt-8 text-center text-white sm:px-6 sm:pb-10 sm:pt-12"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ background: spotlight }}
        />
        <div className="relative">
          <img
            alt=""
            src={icon}
            className="mx-auto h-[118px] w-[156px] object-contain"
          />
          <h3 className="mt-5 text-[30px] leading-none tracking-[-0.02em] sm:mt-6 sm:text-[38px]">
            {title}
          </h3>
          <p className="mx-auto mt-3 max-w-[470px] text-base leading-[1.2] text-white/90 sm:mt-4 sm:text-[18px]">
            {body}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function WaitlistHero() {
  const [joined, setJoined] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share with a Friend");

  async function handleShare() {
    try {
      if (typeof window === "undefined") return;
      await navigator.clipboard.writeText(window.location.href);
      setShareLabel("Link copied");
      window.setTimeout(() => setShareLabel("Share with a Friend"), 1800);
    } catch {
      setShareLabel("Copy failed");
      window.setTimeout(() => setShareLabel("Share with a Friend"), 1800);
    }
  }

  const ease = [0.23, 1, 0.32, 1] as const;

  return (
    <section className="relative overflow-hidden bg-[#0F1012] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[1080px] opacity-85">
          <div className="relative mx-auto h-full w-[1920px] max-w-none">
            {Array.from({ length: 18 }).map((_, idx) => (
              <div
                key={`waitlist-hero-stripe-${idx}`}
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
        <div className="absolute inset-y-0 left-0 w-[240px] bg-linear-to-r from-[#0F1012] to-transparent" />
        <div className="absolute inset-y-0 right-0 w-[240px] bg-linear-to-l from-[#0F1012] to-transparent" />
        <div className="absolute left-1/2 top-[300px] h-[380px] w-[1080px] -translate-x-1/2 rounded-[999px] bg-[#FF0000]/22 blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1920px] pb-8 sm:pb-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
          className="landing-shell flex items-center justify-between gap-3 pt-4 sm:pt-6"
        >
          <Link href="/" className="landing-link shrink-0">
            <img
              alt="ARKHV"
              src={landingAssets.logoWordmarkLight}
              className="h-5 w-28 sm:h-6 sm:w-32"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/waitlist"
              className="landing-pill-btn h-10 border-ark-red-600 bg-ark-red-600 px-3 text-xs text-white shadow-[0px_0px_30px_rgba(255,0,0,0.7)] hover:bg-[#d40000] sm:h-[58px] sm:px-[30px] sm:text-[14px]"
            >
              Book a demo
            </Link>
            <Link
              href={appAuthHref}
              className="landing-pill-btn h-10 border-white/30 bg-transparent px-3 text-xs text-white/95 hover:border-white/55 hover:bg-white/8 sm:h-[58px] sm:px-[30px] sm:text-[14px]"
            >
              Sign In
            </Link>
          </div>
        </motion.div>

        <div className="landing-shell flex flex-col items-center pb-10 pt-12 text-center sm:pb-[68px] sm:pt-[170px]">
          {!joined ? (
            <>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.5, ease }}
                className="inline-flex h-10 items-center rounded-full border border-ark-red-600 bg-ark-red-600 px-5 text-sm font-medium text-white shadow-[0px_0px_30px_rgba(255,0,0,0.75)] sm:h-[51px] sm:px-8 sm:text-[24px]"
              >
                Limited Early Access
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.5, ease }}
                className="mt-6 max-w-[1180px] font-(--font-ark-display) text-[clamp(2rem,8vw,3.875rem)] leading-[1.02] sm:mt-7"
              >
                Join the Founding Members Waiting List
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.5, ease }}
                className="landing-subtitle mt-4 max-w-[840px] px-1 text-[clamp(1rem,1.25vw,1.5rem)] text-white/75 sm:mt-5"
              >
                Be the first to access our platform before public launch.
                <br />
                Secure early pricing and priority onboarding.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.5, ease }}
                className="w-full"
              >
                <WaitlistEmailForm
                  variant="inline"
                  placeholder="Enter your email address"
                  submitLabel="Join Now"
                  className="mt-8 sm:mt-12"
                  showStatusMessage={false}
                  onSuccess={() => setJoined(true)}
                />
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5, ease }}
                className="mt-8 text-[18px] text-white"
              >
                No spam. Early access updates only.
              </motion.p>
            </>
          ) : (
            <div className="mt-6 flex w-full flex-col items-center">
              <img
                alt=""
                src={waitlistSuccessIcon}
                className="h-[92px] w-[110px] object-contain sm:h-[130px] sm:w-[155px]"
              />
              <h1 className="mt-4 max-w-[1180px] font-(--font-ark-display) text-[clamp(2rem,8vw,3.875rem)] leading-[1.02]">
                You&apos;re on the List!
              </h1>
              <p className="landing-subtitle mt-2 max-w-[840px] px-1 text-[clamp(1rem,1.25vw,1.5rem)] text-white/50">
                We&apos;ve reserved your spot.
                <br />
                Check your inbox for confirmation details.
              </p>
              <button
                type="button"
                onClick={() => void handleShare()}
                className="landing-pill-btn landing-pill-btn-secondary-dark mt-7 h-[52px] w-full max-w-[280px] border-white/10 bg-white/5 px-6 text-white sm:mt-9 sm:h-[58px] sm:min-w-[260px] sm:w-auto sm:px-8"
              >
                {shareLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function WaitlistSectionWhatIsArkhv() {
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          headingRef.current?.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "-30px 0px" },
    );
    if (headingRef.current) observer.observe(headingRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden bg-white pb-16 pt-16 sm:pb-24 sm:pt-28">
      <img
        alt=""
        src={landingAssets.bgWashMid}
        className="pointer-events-none absolute left-1/2 top-[-220px] h-[1439px] w-[2558px] max-w-none -translate-x-1/2 object-cover opacity-[0.2]"
      />

      <div className="landing-shell relative z-10">
        <div ref={headingRef} className="">
          <h2 className="landing-h2 text-center text-[#1E1E1E]">
            What is ARKHV?
          </h2>
          <p className="mx-auto mt-4 max-w-[720px] text-center text-lg text-black sm:text-[24px]">
            ARKHV helps teams manage design and creative requests in one
            organized workspace.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:mt-12 md:grid-cols-3">
          {WHAT_IS_ITEMS.map((item, i) => (
            <WhatIsCard
              key={item.title}
              title={item.title}
              body={item.body}
              icon={item.icon}
              revealDelay={i * 80}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function WaitlistSectionCreativeWork() {
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          headingRef.current?.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "-30px 0px" },
    );
    if (headingRef.current) observer.observe(headingRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden bg-white pb-16 pt-8 sm:pb-24">
      <div className="landing-shell">
        <div ref={headingRef} className="ark-reveal">
          <h2 className="landing-h2 text-center text-[#1E1E1E]">
            A Better Way to Manage Creative Work
          </h2>
          <p className="mx-auto mt-4 max-w-[807px] text-center text-lg text-[#1E1E1E] sm:text-[24px]">
            ARKHV gives teams visibility into requests, activity, and team
            collaboration.
          </p>
        </div>
      </div>

      <div className="relative mt-8 space-y-5 overflow-hidden sm:mt-10 sm:space-y-7">
        <div className="hub-row-wrapper">
          <div className="hub-row-left flex items-center gap-[30px]">
            {[...SHOWCASE_ROW_A, ...SHOWCASE_ROW_A].map((src, idx) => (
              <img
                key={`waitlist-showcase-row-a-${idx}`}
                alt=""
                src={src}
                className="hub-shot-img h-[170px] w-[270px] shrink-0 rounded-[10px] border border-black/15 object-cover sm:h-[243px] sm:w-[383px]"
              />
            ))}
          </div>
        </div>
        <div className="hub-row-wrapper">
          <div className="hub-row-right flex items-center gap-[30px]">
            {[...SHOWCASE_ROW_B, ...SHOWCASE_ROW_B].map((src, idx) => (
              <img
                key={`waitlist-showcase-row-b-${idx}`}
                alt=""
                src={src}
                className="hub-shot-img h-[170px] w-[270px] shrink-0 rounded-[10px] border border-black/15 object-cover sm:h-[243px] sm:w-[383px]"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function WaitlistPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <CursorGlow />
      <WaitlistHero />
      <WaitlistSectionWhatIsArkhv />
      <WaitlistSectionCreativeWork />
      <LandingSectionWaitlist
        title="Get Early Access to Your Creative Team"
        subtitle="Join the waitlist to secure founding member pricing and priority onboarding."
      />
      <LandingSectionFooter />
    </main>
  );
}
