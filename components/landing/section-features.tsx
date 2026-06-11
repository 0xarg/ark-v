"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import featureIllus1 from "@/public/landing/feature-illus1.png";
import featureIllus2 from "@/public/landing/feature-illus2.png";
import featureIllus3 from "@/public/landing/feature-illus3.png";
import featureIllus4 from "@/public/landing/feature-illus4.png";
import { StaticImageData } from "next/image";

/**
 * Figma: "A Better Way…" — title `1021:7387`, cards `1021:7389`–`1021:7392`, copy `1021:7397`–`1021:7408`.
 */
const ITEMS: { title: string; body: string; illus: StaticImageData }[] = [
  {
    title: "Structured Requests",
    body: "Every task is clear, scoped, and ready for execution from the start.",
    illus: featureIllus1,
  },
  {
    title: "Real-Time Progress",
    body: "Know exactly what your team is working on, at every stage.",
    illus: featureIllus2,
  },
  {
    title: "Centralized Workflow",
    body: " Files, feedback, and updates — all in one place.",
    illus: featureIllus3,
  },
  {
    title: "Faster Output",
    body: "Less back-and-forth. More getting done.",
    illus: featureIllus4,
  },
];

function FeatureCard({
  item,
  revealDelay,
}: {
  item: (typeof ITEMS)[0];
  revealDelay: number;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 150, damping: 25, mass: 0.5 });
  const rotateY = useSpring(tiltY, { stiffness: 150, damping: 25, mass: 0.5 });

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
      { threshold: 0.1, rootMargin: "-30px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [revealDelay]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    tiltX.set(y * -5);
    tiltY.set(x * 5);
  };

  const handleMouseLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  return (
    <div ref={outerRef} className="ark-reveal" style={{ perspective: "1000px" }}>
      <motion.div
        ref={cardRef}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{ boxShadow: "0px 18px 44px rgba(0,0,0,0.13)" }}
        initial={{ boxShadow: "0px 0px 0px rgba(0,0,0,0)" }}
        transition={{ boxShadow: { duration: 0.2 } }}
        className="flex flex-col justify-center gap-4 overflow-hidden rounded-[32px] bg-[#CDCDCD] px-4 py-4 sm:flex-row sm:items-center sm:px-5 sm:py-5"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative mx-auto h-[106px] w-full max-w-[142px] shrink-0 sm:mx-0 sm:h-[156px] sm:w-[176px]">
          <img
            alt=""
            src={item.illus.src}
            className="h-full w-full object-contain object-center"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[20px] font-medium leading-[22px] tracking-[-0.35px] text-black sm:text-[24px] sm:leading-[26px]">
            {item.title}
          </h3>
          <p className="mt-2.5 max-w-[430px] text-[14px] font-medium leading-[19px] text-black/75">
            {item.body}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export function LandingSectionFeatures() {
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
    <section
      id="features"
      className="landing-section relative z-1 bg-transparent pt-6"
    >
      <div className="landing-shell">
        <div ref={headingRef} className="ark-reveal">
          <h2 className="landing-h2 text-center text-[#1E1E1E]">
            A Better Way to Get Creative Work Done
          </h2>
        </div>

        <div className="mx-auto mt-12 grid max-w-[1620px] items-center gap-5 md:grid-cols-2">
          {ITEMS.map((item, i) => (
            <FeatureCard
              key={item.title}
              item={item}
              revealDelay={(i % 2) * 80}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
