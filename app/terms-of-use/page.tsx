import type { Metadata } from "next";
import Link from "next/link";
import { ArkhvLogo } from "@/components/brand/arkhv-logo";

export const metadata: Metadata = {
  title: "Terms of Use — ARKHV",
  description: "Read the terms and conditions that govern your use of the ARKHV platform.",
  alternates: { canonical: "/terms-of-use" },
};

export default function TermsOfUsePage() {
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
          Terms of Use
        </h1>
        <p className="mb-12 text-[14px] text-[#6D6D6D]">Last updated: April 29, 2026</p>

        <div className="space-y-10 text-[15px] leading-[1.75] text-[#2F3744]">
          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the ARKHV platform (&ldquo;Service&rdquo;), you agree to be
              bound by these Terms of Use. If you do not agree to these terms, please do not use
              our Service. These terms apply to all visitors, subscribers, and users of the
              platform.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              2. Description of Service
            </h2>
            <p>
              ARKHV provides an on-demand creative subscription platform connecting clients with
              professional design, production, and creative services. Subscribers submit requests
              through the platform and receive deliverables produced by our creative team within
              agreed timeframes.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              3. Account Registration
            </h2>
            <p>
              To access the Service, you must create an account and provide accurate, complete
              information. You are responsible for maintaining the confidentiality of your
              credentials and for all activity that occurs under your account. You must promptly
              notify us of any unauthorised use of your account.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              4. Subscriptions & Billing
            </h2>
            <p className="mb-3">
              ARKHV operates on a subscription model. By subscribing, you authorise us to charge
              your payment method on a recurring basis according to your selected plan. Key billing
              terms:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>Subscriptions renew automatically unless cancelled before the renewal date.</li>
              <li>
                Plan changes take effect at the start of the next billing cycle unless otherwise
                stated.
              </li>
              <li>All fees are stated in USD and are exclusive of applicable taxes.</li>
              <li>We reserve the right to modify pricing with 30 days&rsquo; notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              5. Intellectual Property
            </h2>
            <p>
              Upon full payment, you own the final deliverables produced for you through the
              platform. ARKHV retains the right to display work in its portfolio unless you request
              otherwise in writing. All platform software, branding, and underlying technology
              remain the exclusive property of ARKHV.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              6. Acceptable Use
            </h2>
            <p className="mb-3">You agree not to use the Service to:</p>
            <ul className="ml-5 list-disc space-y-2">
              <li>Submit requests for illegal, harmful, or defamatory content.</li>
              <li>Violate any applicable laws or third-party rights.</li>
              <li>Attempt to reverse-engineer, scrape, or compromise the platform.</li>
              <li>Resell or sublicense access to the Service without our written consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              7. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, ARKHV shall not be liable for any indirect,
              incidental, special, or consequential damages arising from your use of the Service.
              Our total liability to you for any claim shall not exceed the amount you paid to us
              in the three months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">8. Termination</h2>
            <p>
              Either party may terminate the subscription at any time. Upon termination, your
              access to the platform will cease at the end of your current billing period. We
              reserve the right to suspend or terminate accounts that violate these Terms
              immediately and without notice.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">9. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with applicable law. Any
              disputes arising from these Terms shall be resolved through good-faith negotiation,
              and if unresolved, through binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              10. Changes to Terms
            </h2>
            <p>
              We may revise these Terms at any time. We will notify you of significant changes via
              email or in-platform notice. Continued use of the Service after the effective date
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">11. Contact</h2>
            <p>
              For questions about these Terms, please contact us at{" "}
              <a href="mailto:legal@arkhv.com" className="text-[#E80000] underline">
                legal@arkhv.com
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
