"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useMotionTemplate, useSpring } from "motion/react";
import { landingAssets } from "@/components/landing/assets";

/**
 * Figma: "Why Teams Struggle…" — title `1021:7380`, sub `1021:7385`, cards `1021:7388`–`1021:7394`.
 */
const CARDS: { title: string; body: string; icon: string }[] = [
  {
    title: "Requests Are Everywhere",
    body: "Slack, email, voice notes — your team is chasing work instead of doing it.",
    icon: landingAssets.iconStruggle1,
  },
  {
    title: "No Clear Ownership",
    body: "Tasks get lost, duplicated, or delayed because no one owns the process.",
    icon: landingAssets.iconStruggle2,
  },
  {
    title: "Endless Revisions",
    body: "Bad briefs and scattered feedback turn simple tasks into long cycles.",
    icon: landingAssets.iconStruggle3,
  },
];

function StruggleCard({
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
    <div ref={outerRef} className="ark-reveal" style={{ perspective: "1000px" }}>
      <motion.div
        ref={cardRef}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ boxShadow: "0px 24px 60px rgba(255,0,0,0.35)" }}
        initial={{ boxShadow: "0px 14px 44px rgba(255,0,0,0.2)" }}
        transition={{ boxShadow: { duration: 0.2 } }}
        className="relative overflow-hidden rounded-[36px] bg-[#2F3744] px-7 py-8 text-white"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Mouse-tracking spotlight */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ background: spotlight }}
        />

        {/* Content sits above spotlight */}
        <div className="relative">
          <div className="mx-auto flex h-9 w-9 items-center justify-center">
            <img alt="" src={icon} className="h-full w-full object-contain" />
          </div>
          <div className="mt-6 text-center text-[20px] font-medium leading-[22px] tracking-[-0.36px]">
            {title}
          </div>
          <div className="mt-3 text-center text-[15px] font-medium leading-[21px] tracking-[-0.1px] text-white/75">
            {body}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function LandingSectionStruggle() {
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          headingRef.current?.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "-30px 0px" },
    );
    if (headingRef.current) observer.observe(headingRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="why" className="landing-section relative z-1 bg-transparent">
      <div className="landing-shell">
        <div ref={headingRef} className="ark-reveal">
          <h2 className="landing-h2 text-center text-[#0F1012]">
            Why Creative Work Slows Teams Down
          </h2>
          <p className="landing-subtitle mx-auto mt-4 max-w-[840px] text-center text-[#0F1012]/85">
            Most teams don't have a design problem — they have a system problem.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {CARDS.map((c, i) => (
            <StruggleCard
              key={c.title}
              title={c.title}
              body={c.body}
              icon={c.icon}
              revealDelay={i * 80}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
