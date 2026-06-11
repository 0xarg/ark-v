"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { landingAssets } from "@/components/landing/assets";
import {
  PLAN_CONFIG,
  PRIMARY_PLAN_KEYS,
  YEARLY_DISCOUNT,
  formatPlanPrice,
  yearlyPrice,
  type PrimaryPlanKey,
} from "@/lib/config/plans";

function TickRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 border-b border-black/6 py-[7px] text-[12px] leading-[20px] text-[#0F1012]/80 first:pt-0 last:border-b-0">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M9.8405 17.0725C9.67553 17.2374 9.44183 17.3749 9.23563 17.3749C9.02942 17.3749 8.79572 17.2306 8.62388 17.0656L4.77469 13.2164L5.99818 11.9929L9.2425 15.2372L17.8207 6.59717L19.0236 7.84128L9.8405 17.0725Z"
          fill="#FF0000"
          stroke="#FF0000"
          strokeWidth="0.2"
          fillOpacity="0.54"
        />
      </svg>
      <span>{children}</span>
    </li>
  );
}

function PlanIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E80000]/10">
      {icon}
    </div>
  );
}

type BillingCycle = "monthly" | "yearly";

// Icons stay local — they're JSX and can't live in a lib file
const PLAN_ICONS: Record<PrimaryPlanKey, React.ReactNode> = {
  starter: (
    <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42" fill="none">
      <path d="M35.8225 12.8976C35.8225 12.8976 35.8225 12.8976 35.8225 12.7576L35.7175 12.4951C35.6809 12.4394 35.64 12.3867 35.595 12.3376C35.5482 12.2635 35.4955 12.1933 35.4375 12.1276L35.28 12.0051L35 11.8651L21.875 3.76259C21.5969 3.58875 21.2755 3.49658 20.9475 3.49658C20.6195 3.49658 20.2981 3.58875 20.02 3.76259L6.99999 11.8651L6.84249 12.0051L6.68499 12.1276C6.62698 12.1933 6.57432 12.2635 6.52749 12.3376C6.4825 12.3867 6.44154 12.4394 6.40499 12.4951L6.29999 12.7576C6.29999 12.7576 6.29999 12.7576 6.29999 12.8976C6.28279 13.0488 6.28279 13.2014 6.29999 13.3526V28.6476C6.2994 28.945 6.37461 29.2376 6.51852 29.4979C6.66243 29.7582 6.8703 29.9775 7.12249 30.1351L20.2475 38.2376C20.3283 38.2875 20.4171 38.323 20.51 38.3426C20.51 38.3426 20.5975 38.3426 20.65 38.3426C20.9461 38.4365 21.2639 38.4365 21.56 38.3426C21.56 38.3426 21.6475 38.3426 21.7 38.3426C21.7929 38.323 21.8817 38.2875 21.9625 38.2376L35 30.1351C35.2522 29.9775 35.4601 29.7582 35.604 29.4979C35.7479 29.2376 35.8231 28.945 35.8225 28.6476V13.3526C35.8397 13.2014 35.8397 13.0488 35.8225 12.8976ZM19.25 33.6176L9.62499 27.6676V16.5026L19.25 22.4351V33.6176ZM21 19.4076L11.2 13.3526L21 7.31509L30.8 13.3526L21 19.4076ZM32.375 27.6676L22.75 33.6176V22.4351L32.375 16.5026V27.6676Z" fill="#FF0000"/>
      <path d="M33.2947 13.0178L22.0449 20.2696L20.6504 35.8892L8.37793 28.5443V13.0178L20.6504 5.20801L33.2947 13.0178Z" fill="#FF0000"/>
    </svg>
  ),
  growth: (
    <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42" fill="none">
      <path d="M12.8975 6.17749C12.8975 6.17749 12.8975 6.17749 12.7575 6.17749L12.495 6.28249C12.4393 6.31904 12.3867 6.36 12.3375 6.40499C12.2634 6.45181 12.1932 6.50448 12.1275 6.56249L12.005 6.71999L11.865 6.99999L3.76253 20.125C3.58869 20.4031 3.49652 20.7245 3.49652 21.0525C3.49652 21.3805 3.58869 21.7019 3.76253 21.98L11.865 35L12.005 35.1575L12.1275 35.315C12.1932 35.373 12.2634 35.4257 12.3375 35.4725C12.3867 35.5175 12.4393 35.5584 12.495 35.595L12.7575 35.7C12.7575 35.7 12.7575 35.7 12.8975 35.7C13.0487 35.7172 13.2013 35.7172 13.3525 35.7L28.6475 35.7C28.9449 35.7006 29.2376 35.6254 29.4978 35.4815C29.7581 35.3376 29.9774 35.1297 30.135 34.8775L38.2375 21.7525C38.2874 21.6717 38.3229 21.5829 38.3425 21.49C38.3425 21.49 38.3425 21.4025 38.3425 21.35C38.4364 21.0539 38.4364 20.7361 38.3425 20.44C38.3425 20.44 38.3425 20.3525 38.3425 20.3C38.3229 20.2071 38.2874 20.1183 38.2375 20.0375L30.135 6.99999C29.9774 6.74779 29.7581 6.53993 29.4978 6.39602C29.2376 6.2521 28.9449 6.1769 28.6475 6.17749L13.3525 6.17749C13.2013 6.16029 13.0487 6.16029 12.8975 6.17749ZM33.6175 22.75L27.6675 32.375L16.5025 32.375L22.435 22.75L33.6175 22.75ZM19.4075 21L13.3525 30.8L7.31503 21L13.3525 11.2L19.4075 21ZM27.6675 9.62499L33.6175 19.25L22.435 19.25L16.5025 9.62499L27.6675 9.62499Z" fill="#FF0000"/>
      <path d="M13.018 8.70484L20.2699 19.9546L35.8894 21.3491L28.5445 33.6216L13.018 33.6216L5.20825 21.3491L13.018 8.70484Z" fill="#FF0000"/>
    </svg>
  ),
  scale: (
    <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42" fill="none">
      <path d="M6.17749 29.1024C6.17749 29.1024 6.17749 29.1024 6.17749 29.2424L6.28249 29.5049C6.31904 29.5606 6.36 29.6133 6.40499 29.6624C6.45181 29.7365 6.50448 29.8067 6.56249 29.8724L6.71999 29.9949L6.99999 30.1349L20.125 38.2374C20.4031 38.4112 20.7245 38.5034 21.0525 38.5034C21.3805 38.5034 21.7019 38.4112 21.98 38.2374L35 30.1349L35.1575 29.9949L35.315 29.8724C35.373 29.8067 35.4257 29.7365 35.4725 29.6624C35.5175 29.6133 35.5584 29.5606 35.595 29.5049L35.7 29.2424C35.7 29.2424 35.7 29.2424 35.7 29.1024C35.7172 28.9512 35.7172 28.7986 35.7 28.6474L35.7 13.3524C35.7006 13.055 35.6254 12.7624 35.4815 12.5021C35.3376 12.2418 35.1297 12.0225 34.8775 11.8649L21.7525 3.76241C21.6717 3.71252 21.5829 3.677 21.49 3.65741C21.49 3.65741 21.4025 3.65741 21.35 3.65741C21.0539 3.56351 20.7361 3.56351 20.44 3.65741C20.44 3.65741 20.3525 3.65741 20.3 3.65741C20.2071 3.677 20.1183 3.71252 20.0375 3.76241L6.99999 11.8649C6.7478 12.0225 6.53993 12.2418 6.39602 12.5021C6.25211 12.7624 6.1769 13.055 6.17749 13.3524L6.17749 28.6474C6.16029 28.7986 6.16029 28.9512 6.17749 29.1024ZM22.75 8.38241L32.375 14.3324L32.375 25.4974L22.75 19.5649L22.75 8.38241ZM21 22.5924L30.8 28.6474L21 34.6849L11.2 28.6474L21 22.5924ZM9.62499 14.3324L19.25 8.38241L19.25 19.5649L9.62499 25.4974L9.62499 14.3324Z" fill="#FF0000"/>
      <path d="M8.70532 28.9822L19.9551 21.7304L21.3496 6.11082L33.6221 13.4557L33.6221 28.9822L21.3496 36.792L8.70532 28.9822Z" fill="#FF0000"/>
    </svg>
  ),
};

function priceForCycle(monthlyPrice: number, cycle: BillingCycle) {
  if (cycle === "monthly") return monthlyPrice;
  return yearlyPrice(monthlyPrice);
}

// Build the plans array from the config — no hardcoded prices here
type Plan = {
  key: PrimaryPlanKey;
  name: string;
  icon: React.ReactNode;
  blurb1: string;
  blurb2: string;
  monthlyPrice: number;
  howItWorks: string;
  featured: boolean;
  features: readonly string[];
};

const PLANS: Plan[] = PRIMARY_PLAN_KEYS.map((key) => {
  const cfg = PLAN_CONFIG[key];
  return {
    key,
    name: cfg.display_name.toUpperCase(),
    icon: PLAN_ICONS[key],
    blurb1: cfg.blurb,
    blurb2: cfg.blurb2,
    monthlyPrice: cfg.price_monthly_usd,
    howItWorks: cfg.how_it_works,
    featured: cfg.featured,
    features: cfg.features,
  };
});


/**
 * Figma: `1021:7433`–`1021:7432`, toggle `1021:7428`–`1021:7431`, cards `1021:8445`–`1021:8617`.
 */
function PricingCard({
  plan,
  cycle,
  revealDelay,
}: {
  plan: Plan;
  cycle: BillingCycle;
  revealDelay: number;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 120, damping: 28, mass: 0.5 });
  const rotateY = useSpring(tiltY, { stiffness: 120, damping: 28, mass: 0.5 });

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
      { threshold: 0.1, rootMargin: "-20px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [revealDelay]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    tiltX.set(y * -4);
    tiltY.set(x * 4);
  };

  const handleMouseLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  return (
    <div
      ref={outerRef}
      className="ark-reveal relative"
      style={{ perspective: "1200px" }}
    >
      {plan.featured ? (
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[300px] bg-[#E80000] px-4 text-[12px] font-semibold leading-[34px] text-white shadow-[0px_8px_10px_0px_rgba(255,0,0,0.18)] sm:text-[13px] sm:leading-[42px]">
          Most Popular
        </div>
      ) : null}

      <motion.div
        ref={cardRef}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        whileHover={{
          boxShadow: plan.featured
            ? "0px 24px 52px rgba(232,0,0,0.2)"
            : "0px 24px 52px rgba(0,0,0,0.1)",
        }}
        initial={{ boxShadow: "0px 14px 34px 0px rgba(0,0,0,0.05)" }}
        transition={{ boxShadow: { duration: 0.2 } }}
        className={[
          "flex h-full flex-col rounded-[50px] bg-white p-2 sm:min-h-[610px]",
          plan.featured ? "ring-1 ring-inset" : "",
        ].join(" ")}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="rounded-[44px] bg-[#EEE] px-4 pb-4 pt-3.5">
          <div className="flex items-start gap-3">
            <PlanIcon icon={plan.icon} />
            <div className="min-w-0 flex-1">
              <div className="text-[24px] font-medium leading-none text-[#0F1012]">
                {plan.name.charAt(0) + plan.name.slice(1).toLowerCase()}
              </div>
              <p className="mt-1.5 text-[11px] leading-[16px]  text-[#0F1012]/65">
                {plan.blurb1}
              </p>
              <p className=" text-[11px] leading-[16px]   text-[#0F1012]/65">
                {plan.blurb2}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-end gap-1.5">
            <span className="text-[32px] font-semibold leading-none tracking-[0.06em] text-[#0F1012]">
              {formatPlanPrice(priceForCycle(plan.monthlyPrice, cycle))}
            </span>
            <span className="text-[14px]">
              {cycle === "monthly" ? "per month" : "per year"}
            </span>
          </div>
          {cycle === "yearly" ? (
            <p className="mt-1 text-[11px] leading-[16px] text-[#0F1012]/60">
              Billed yearly. Equivalent to{" "}
              {formatPlanPrice(
                Math.round(priceForCycle(plan.monthlyPrice, "yearly") / 12),
              )}{" "}
              / month.
            </p>
          ) : null}
          <Link
            href="/waitlist"
            className={[
              "mt-6 inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-full text-[14px] font-medium",
              plan.featured
                ? "bg-[#E80000] text-white shadow-[0px_8px_20px_rgba(232,0,0,0.28)]"
                : "border border-[rgba(15,16,18,0.24)] bg-white text-[#0F1012]",
            ].join(" ")}
            style={{
              transition:
                "transform 160ms cubic-bezier(0.23,1,0.32,1), background-color 180ms cubic-bezier(0.23,1,0.32,1), border-color 180ms cubic-bezier(0.23,1,0.32,1)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              if (plan.featured) el.style.backgroundColor = "#d10000";
              else {
                el.style.borderColor = "rgba(15,16,18,0.42)";
                el.style.backgroundColor = "#FAFAFA";
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              if (plan.featured) el.style.backgroundColor = "#E80000";
              else {
                el.style.borderColor = "rgba(15,16,18,0.24)";
                el.style.backgroundColor = "white";
              }
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform =
                "scale(0.97)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.transform =
                "scale(1)";
            }}
          >
            Get Started
          </Link>
        </div>

        <div className="mx-2 mt-6 px-2">
          <div className="flex items-center gap-2 text-[20px] font-semibold leading-[20px] text-[#0F1012]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="19"
              height="19"
              viewBox="0 0 19 19"
              fill="none"
            >
              <path
                d="M17.8 11.4L14.6 10.1L13.3 6.9C13.2 6.5 12.8 6.3 12.4 6.3C12 6.3 11.6 6.5 11.5 6.9L10.2 10.1L7 11.4C6.6 11.5 6.4 11.9 6.4 12.3C6.4 12.7 6.6 13.1 7 13.2L10.2 14.5L11.5 17.7C11.7 18.1 12 18.3 12.4 18.3C12.8 18.3 13.2 18.1 13.3 17.7L14.6 14.5L17.8 13.2C18.2 13 18.4 12.7 18.4 12.3C18.4 11.9 18.2 11.5 17.8 11.4ZM13.5 12.8C13.3 12.9 13.1 13.1 13 13.3L12.4 14.7L11.9 13.4C11.8 13.2 11.6 13 11.4 12.9L10 12.3L11.3 11.8C11.5 11.7 11.7 11.5 11.8 11.3L12.3 10L12.8 11.3C12.9 11.5 13.1 11.7 13.3 11.8L14.6 12.3L13.5 12.8ZM7.4 8C7.4 7.6 7.2 7.2 6.8 7.1L5.3 6.4L4.6 4.9C4.5 4.5 4.1 4.3 3.7 4.3C3.3 4.3 2.9 4.5 2.8 4.9L2.1 6.4L0.6 7.1C0.2 7.3 0 7.6 0 8C0 8.4 0.2 8.8 0.6 8.9L2.1 9.6L2.8 11.1C3 11.5 3.3 11.7 3.7 11.7C4.1 11.7 4.5 11.5 4.6 11.1L5.3 9.6L6.8 8.9C7.2 8.8 7.4 8.4 7.4 8ZM3.7 8.2C3.6 8.1 3.6 8 3.5 8C3.6 7.9 3.7 7.9 3.7 7.8C3.8 7.9 3.8 8 3.9 8L3.7 8.2ZM11.6 3.7L12.5 4.1L12.9 5C13.1 5.4 13.4 5.6 13.8 5.6C14.2 5.6 14.6 5.4 14.7 5L15.1 4.1L16 3.7C16.4 3.5 16.6 3.2 16.6 2.8C16.6 2.4 16.4 2 16 1.9L15.1 1.5L14.7 0.6C14.5 0.2 14.2 0 13.8 0C13.4 0 13 0.2 12.9 0.6L12.5 1.5L11.6 1.9C11.2 2.1 11 2.4 11 2.8C11 3.2 11.3 3.6 11.6 3.7Z"
                fill="#FF0000"
              />
            </svg>
            <span className="text-[22px]">Includes:</span>
          </div>
          <ul className="mt-3">
            {plan.features.map((f) => (
              <TickRow key={f}>{f}</TickRow>
            ))}
          </ul>
        </div>

        <div className="mx-2 mb-2 mt-auto px-2 pt-4">
          <div className="text-[13px] font-semibold text-[#0F1012]">
            How It Works:
          </div>
          {/* make the text appear in two lines */}
          <p className="mt-1 text-[11px] leading-[18px] tracking-wide text-[#0F1012]/55">
            {plan.howItWorks}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export function LandingSectionPricing() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
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

  return (
    <section
      id="pricing"
      className="landing-section relative overflow-hidden bg-white"
    >
      <img
        alt=""
        src={landingAssets.bgWashLower}
        className="pointer-events-none absolute left-1/2 top-[-120px] h-[1795px] w-[3192px] max-w-none -translate-x-1/2 object-cover opacity-[0.18]"
      />

      <div className="landing-shell relative">
        <div ref={headingRef} className="ark-reveal">
          <h2 className="landing-h2 text-center tracking-[-0.2px] text-[#0F1012]">
            Simple, Scalable Pricing
          </h2>
          <p className="landing-subtitle mx-auto mt-4 max-w-[840px] text-center text-[#0F1012]/80">
            Get a full creative team - for less than the cost of hiring one
            employee.
          </p>
        </div>

        {/* Sliding toggle */}
        <div className="mx-auto mt-8 flex h-[56px] w-full max-w-[520px] rounded-[50px] border border-[rgba(15,16,18,0.1)] bg-white p-1 shadow-[0px_6px_16px_rgba(0,0,0,0.045)] sm:h-[62px] relative">
          {/* sliding pill */}
          <div
            className="absolute top-1 bottom-1 rounded-[50px] pointer-events-none"
            style={{
              width: "calc(50% - 4px)",
              left: cycle === "monthly" ? "4px" : "calc(50%)",
              transition: `left 250ms cubic-bezier(0.77,0,0.175,1), background-color 250ms cubic-bezier(0.77,0,0.175,1)`,
              backgroundColor: cycle === "monthly" ? "#0F1012" : "#E80000",
              boxShadow:
                cycle === "monthly"
                  ? "0px 7px 18px rgba(15,16,18,0.24)"
                  : "0px 7px 18px rgba(255,0,0,0.3)",
            }}
          />
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className="relative flex-1 cursor-pointer rounded-[50px] px-2 text-[12px] font-medium sm:text-[14px]"
            style={{
              color: cycle === "monthly" ? "white" : "rgba(15,16,18,0.8)",
              transition: "color 200ms cubic-bezier(0.23,1,0.32,1)",
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className="relative flex-1 cursor-pointer rounded-[50px] px-2 text-[12px] font-medium sm:text-[14px]"
            style={{
              color: cycle === "yearly" ? "white" : "rgba(15,16,18,0.8)",
              transition: "color 200ms cubic-bezier(0.23,1,0.32,1)",
            }}
          >
            <span className="sm:hidden">Yearly −20%</span>
            <span className="hidden sm:inline">Yearly (Save 20%)</span>
          </button>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <PricingCard
              key={plan.key}
              plan={plan}
              cycle={cycle}
              revealDelay={i * 80}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
