import type { Metadata } from "next";
import Link from "next/link";
import { ArkhvLogo } from "@/components/brand/arkhv-logo";

export const metadata: Metadata = {
  title: "Refund Policy — ARKHV",
  description: "Understand ARKHV's refund and cancellation policy for creative subscriptions.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-black/8 px-6 py-5">
        <div className="mx-auto max-w-4xl">
          <Link href="/">
            <ArkhvLogo variant="wordmark-default" className="h-6 w-32" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="mb-2 text-[36px] font-semibold tracking-[-0.5px] text-[#0F1012]">
          Refund Policy
        </h1>
        <p className="mb-12 text-[14px] text-[#6D6D6D]">Last updated: April 29, 2026</p>

        <div className="space-y-10 text-[15px] leading-[1.75] text-[#2F3744]">
          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">1. Overview</h2>
            <p>
              At ARKHV, we are committed to delivering high-quality creative work. This Refund
              Policy outlines the circumstances under which refunds or credits may be issued. By
              subscribing to any ARKHV plan, you acknowledge and agree to the terms described
              below.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              2. Subscription Fees
            </h2>
            <p>
              All subscription fees are charged in advance for the upcoming billing period.{" "}
              <strong>Subscription fees are generally non-refundable</strong> once a billing cycle
              has begun, as our creative team begins allocating capacity and resources to your
              account from the first day of each period.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              3. Eligibility for Refunds
            </h2>
            <p className="mb-3">
              Refunds may be considered on a case-by-case basis in the following situations:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong>Duplicate charges:</strong> If you were charged more than once for the
                same billing period due to a technical error.
              </li>
              <li>
                <strong>Service unavailability:</strong> If the ARKHV platform experienced
                significant downtime (exceeding 72 consecutive hours) during your active billing
                period.
              </li>
              <li>
                <strong>Onboarding cancellations:</strong> If you cancel within 48 hours of your
                first subscription payment and no creative work has been started on your account,
                you may be eligible for a full refund.
              </li>
              <li>
                <strong>Billing errors:</strong> If you were charged an incorrect amount due to a
                pricing or system error on our part.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              4. Non-Refundable Items
            </h2>
            <p className="mb-3">The following are not eligible for refunds:</p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                Subscription fees for billing periods where creative work has been delivered or
                is in progress.
              </li>
              <li>Partial months — unused days within a billing cycle are not refundable.</li>
              <li>
                Add-on services or rush fees once the work has been initiated.
              </li>
              <li>
                Subscriptions cancelled after the 48-hour onboarding window.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              5. Cancellations
            </h2>
            <p>
              You may cancel your subscription at any time from your account settings. Upon
              cancellation, your access to the platform and active requests will continue until
              the end of your current paid billing period. No further charges will be made after
              cancellation. We do not offer prorated refunds for early cancellations mid-cycle.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              6. Credits & Goodwill Adjustments
            </h2>
            <p>
              In cases where a full refund is not applicable but we acknowledge a service
              shortfall, ARKHV may offer account credits at our discretion. Credits are applied to
              future billing cycles and have no cash value. They are non-transferable and expire
              12 months from the date of issuance.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              7. How to Request a Refund
            </h2>
            <p className="mb-3">
              To request a refund, please contact our support team within 14 days of the charge
              in question:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                Email:{" "}
                <a href="mailto:billing@arkhv.com" className="text-[#E80000] underline">
                  billing@arkhv.com
                </a>
              </li>
              <li>Subject: Refund Request — [your account email]</li>
              <li>
                Include: the date of charge, amount, and a brief description of the issue.
              </li>
            </ul>
            <p className="mt-3">
              We aim to respond to all refund requests within 3 business days. Approved refunds
              are processed within 5–10 business days and returned to the original payment method.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              8. Changes to This Policy
            </h2>
            <p>
              ARKHV reserves the right to update this Refund Policy at any time. Changes will be
              communicated via email or in-platform notification. Continued use of the Service
              after such changes constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">9. Contact</h2>
            <p>
              For any billing or refund enquiries, please contact us at{" "}
              <a href="mailto:billing@arkhv.com" className="text-[#E80000] underline">
                billing@arkhv.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-black/8 px-6 py-8 text-center text-[13px] text-[#6D6D6D]">
        © 2026 Arkhv. All rights reserved.
      </footer>
    </div>
  );
}
