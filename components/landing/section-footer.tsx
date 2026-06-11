"use client";

import Link from "next/link";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { ArkhvLogo } from "@/components/brand/arkhv-logo";

const CREATIVE = [
  "Ad creative",
  "Social media creative",
  "Presentation design",
  "Illustration design",
  "Branding services",
  "Books & report design",
  "Concept creation",
  "Print design",
  "Packaging & merchandise design",
];

const PRODUCTION = [
  "Video production",
  "Motion design",
  "Immersive design",
  "Email creation",
  "Web design",
  "Design Systems",
  "Product Design",
  "Copywriting",
];

const MAIN = [
  "Our work",
  "Our people",
  "About us",
  "Pricing",
  "Trust center",
  "Careers",
  "Superside vs. Alternatives",
  "Forrester TEI Report",
];

const LEARN = [
  "Blog",
  "Events & Summits",
  "Guides",
  "Reports",
  "Customer Stories",
  "Video Library",
  "Playbooks",
  "What's new",
  "Help Center",
];

/**
 * Figma: `1021:8385` Frame 595 — link columns + utility row `1021:8404`.
 */
export function LandingSectionFooter() {
  return (
    <footer className="bg-white pb-10 pt-0 sm:pt-0">
      <div className="landing-shell">
        {/* <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-7">
          <div>
            <div className="flex items-center gap-2 text-[16px] font-medium tracking-[-0.48px] text-[#0F1012]">
              Creative design services
              <span aria-hidden className="text-[#0F1012]">
                →
              </span>
            </div>
            <ul className="mt-4 space-y-0 text-[14px] leading-[32px] text-[#6D6D6D] sm:mt-6 sm:leading-[40px]">
              {CREATIVE.map((label) => (
                <li key={label}>
                  <Link
                    href="/waitlist"
                    className="landing-link inline-flex items-center gap-2 hover:text-[#0F1012]"
                  >
                    {label === "Ad creative" ? (
                      <span
                        className="inline-block h-[8px] w-[8px] shrink-0 rounded-full bg-[#E80000]"
                        aria-hidden
                      />
                    ) : null}
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[16px] font-medium tracking-[-0.88px] text-[#0F1012]">
              Specialized production services
              <span aria-hidden className="text-[#0F1012]">
                →
              </span>
            </div>
            <ul className="mt-4 space-y-0 text-[14px] leading-[32px] text-[#6D6D6D] sm:mt-6 sm:leading-[40px]">
              {PRODUCTION.map((label) => (
                <li key={label}>
                  <Link href="/waitlist" className="landing-link hover:text-[#0F1012]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[16px] font-medium tracking-[-0.48px] text-[#0F1012]">
              Main
            </div>
            <ul className="mt-4 space-y-0 text-[14px] leading-[32px] text-[#6D6D6D] sm:mt-6 sm:leading-[40px]">
              {MAIN.map((label) => (
                <li key={label}>
                  <Link href="/waitlist" className="landing-link hover:text-[#0F1012]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[16px] font-medium tracking-[-0.48px] text-[#0F1012]">
              Learn
            </div>
            <ul className="mt-4 space-y-0 text-[14px] leading-[32px] text-[#6D6D6D] sm:mt-6 sm:leading-[40px]">
              {LEARN.map((label) => (
                <li key={label}>
                  <Link href="/waitlist" className="landing-link hover:text-[#0F1012]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div> */}

        <div className="mt-[20px] border-t border-black/8 pt-[34px]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link href="/" className="landing-link inline-block">
                <ArkhvLogo
                  variant="wordmark-default"
                  className="h-6 w-32"
                />
              </Link>
              <p className="mt-2 text-[14px] font-medium text-[#2F3744]">
                © 2026 Arkhv. All rights reserved.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {[
                { label: "Privacy policy", href: "/privacy-policy" },
                { label: "Terms of use", href: "/terms-of-use" },
                { label: "Refund policy", href: "/refund-policy" },
              ].map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="landing-link inline-flex h-[42px] min-w-[150px] items-center justify-center rounded-[40px] border border-black/12 px-2 text-[14px] font-medium text-[#2F3744]"
                  style={{
                    transition: "transform 160ms cubic-bezier(0.23,1,0.32,1), background-color 180ms cubic-bezier(0.23,1,0.32,1), border-color 180ms cubic-bezier(0.23,1,0.32,1)",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.borderColor = "rgba(0,0,0,0.3)";
                    el.style.backgroundColor = "rgba(0,0,0,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.borderColor = "rgba(0,0,0,0.12)";
                    el.style.backgroundColor = "transparent";
                  }}
                  onMouseDown={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.97)";
                  }}
                  onMouseUp={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)";
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              {[
                {
                  Icon: Instagram,
                  label: "Instagram",
                  href: "https://www.instagram.com",
                },
                {
                  Icon: Youtube,
                  label: "YouTube",
                  href: "https://www.youtube.com",
                },
                {
                  Icon: Facebook,
                  label: "Facebook",
                  href: "https://www.facebook.com",
                },
                {
                  Icon: Linkedin,
                  label: "LinkedIn",
                  href: "https://www.linkedin.com",
                },
              ].map(({ Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="landing-link inline-flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#FF0000]/10 text-[#FF0000]"
                  style={{
                    transition: "transform 160ms cubic-bezier(0.23,1,0.32,1), background-color 180ms cubic-bezier(0.23,1,0.32,1)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.1)";
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,0,0,0.18)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)";
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,0,0,0.1)";
                  }}
                  onMouseDown={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.transform = "scale(0.95)";
                  }}
                  onMouseUp={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.1)";
                  }}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.9} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
