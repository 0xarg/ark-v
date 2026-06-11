import type { Metadata } from "next";
import Link from "next/link";
import { ArkhvLogo } from "@/components/brand/arkhv-logo";

export const metadata: Metadata = {
  title: "Privacy Policy — ARKHV",
  description: "Learn how ARKHV collects, uses, and protects your personal information.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
        <p className="mb-12 text-[14px] text-[#6D6D6D]">Last updated: April 29, 2026</p>

        <div className="space-y-10 text-[15px] leading-[1.75] text-[#2F3744]">
          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">1. Introduction</h2>
            <p>
              ARKHV (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to
              protecting your personal information. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you visit our platform or use our
              creative subscription services.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              2. Information We Collect
            </h2>
            <p className="mb-3">We may collect the following types of information:</p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong>Account information:</strong> Name, email address, company name, and
                billing details when you sign up or subscribe.
              </li>
              <li>
                <strong>Usage data:</strong> Pages visited, features used, request history, and
                interaction logs within the platform.
              </li>
              <li>
                <strong>Communications:</strong> Messages, briefs, and feedback you submit through
                the platform.
              </li>
              <li>
                <strong>Device & technical data:</strong> IP address, browser type, operating
                system, and cookies.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              3. How We Use Your Information
            </h2>
            <ul className="ml-5 list-disc space-y-2">
              <li>To provide, operate, and improve our services.</li>
              <li>To process payments and manage your subscription.</li>
              <li>To communicate with you about your account, requests, and deliverables.</li>
              <li>To personalise your experience and recommend relevant features.</li>
              <li>To comply with legal obligations and prevent fraud.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              4. Sharing Your Information
            </h2>
            <p>
              We do not sell your personal data. We may share information with trusted third-party
              service providers (payment processors, cloud infrastructure, analytics tools) strictly
              to operate our platform. All third parties are bound by confidentiality obligations
              and may not use your data for their own purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">5. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to
              provide services. You may request deletion of your data at any time by contacting us
              at{" "}
              <a href="mailto:privacy@arkhv.com" className="text-[#E80000] underline">
                privacy@arkhv.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">6. Cookies</h2>
            <p>
              We use cookies and similar tracking technologies to maintain sessions, analyse usage
              patterns, and improve performance. You can control cookie preferences through your
              browser settings, though disabling cookies may affect some platform functionality.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">7. Your Rights</h2>
            <p className="mb-3">
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data.</li>
              <li>Object to or restrict certain processing activities.</li>
              <li>Data portability where applicable.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:privacy@arkhv.com" className="text-[#E80000] underline">
                privacy@arkhv.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">8. Security</h2>
            <p>
              We implement industry-standard technical and organisational measures to protect your
              data against unauthorised access, loss, or misuse. However, no method of transmission
              over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by email or by posting a prominent notice on our platform. Continued use of
              our services after changes take effect constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-[20px] font-semibold text-[#0F1012]">10. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy, please reach out to us
              at{" "}
              <a href="mailto:privacy@arkhv.com" className="text-[#E80000] underline">
                privacy@arkhv.com
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
