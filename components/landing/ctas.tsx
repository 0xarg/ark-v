import Link from "next/link";

/** Figma hero Group 723 — primary `1021:7369` */
export function PrimaryCta({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="landing-pill-btn landing-pill-btn-primary w-full sm:min-w-[220px] sm:w-auto"
    >
      {children}
    </Link>
  );
}

export function SecondaryCta({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="landing-pill-btn landing-pill-btn-secondary-dark w-full sm:min-w-[220px] sm:w-auto"
    >
      {children}
    </Link>
  );
}

/** Figma hub CTA `1021:7427` — white pill, red border, near-black label */
export function HubJoinWaitlistCta({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="landing-pill-btn landing-pill-btn-secondary-light w-full sm:min-w-[220px] sm:w-auto border-ark-red-500 shadow-[0px_8px_24px_rgba(255,0,0,0.2)]"
    >
      {children}
    </Link>
  );
}

/** Figma waitlist submit `1021:8441` */
export function WaitlistSubmitCta({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="landing-pill-btn landing-pill-btn-primary w-full sm:min-w-[230px] sm:w-auto text-white hover:text-white"
    >
      {children}
    </Link>
  );
}
