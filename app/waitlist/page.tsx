import type { Metadata } from "next";
import { WaitlistPage } from "@/components/landing/waitlist-page";

export const metadata: Metadata = {
  title: "Join the Waitlist",
  description:
    "Secure your founding member pricing and priority onboarding. Be the first to access ARKHV's on-demand creative team platform before public launch.",
  openGraph: {
    title: "Join the Waitlist — ARKHV",
    description:
      "Secure your founding member pricing and priority onboarding. Be the first to access ARKHV before public launch.",
    url: "/waitlist",
  },
  alternates: { canonical: "/waitlist" },
};

export default function WaitlistRoutePage() {
  return <WaitlistPage />;
}
