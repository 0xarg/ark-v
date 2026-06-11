import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arkhv.io";

export const metadata: Metadata = {
  title: "ARKHV",
  description:
    "ARKHV replaces the need to hire designers, motion artists, and creatives with one streamlined, on-demand subscription. Structured requests, real-time progress, faster output.",
  openGraph: {
    title: "ARKHV — One Subscription for Your Entire Creative Team",
    description:
      "ARKHV replaces the need to hire designers, motion artists, and creatives with one streamlined, on-demand subscription.",
    url: "/",
  },
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "ARKHV",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/landing/logo-wordmark.svg`,
      },
      description:
        "On-demand creative team subscription. Get unlimited design, motion graphics, and creative work for one flat monthly fee.",
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "ARKHV",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "Service",
      "@id": `${siteUrl}/#service`,
      name: "ARKHV Creative Subscription",
      provider: { "@id": `${siteUrl}/#organization` },
      description:
        "Unlimited design requests, motion graphics, ad creatives, landing pages, and more — all managed through one streamlined platform.",
      offers: [
        {
          "@type": "Offer",
          name: "Starter",
          price: "995",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            billingIncrement: 1,
            unitCode: "MON",
          },
          url: `${siteUrl}/#pricing`,
        },
        {
          "@type": "Offer",
          name: "Growth",
          price: "1500",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            billingIncrement: 1,
            unitCode: "MON",
          },
          url: `${siteUrl}/#pricing`,
        },
        {
          "@type": "Offer",
          name: "Scale",
          price: "2000",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            billingIncrement: 1,
            unitCode: "MON",
          },
          url: `${siteUrl}/#pricing`,
        },
      ],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
