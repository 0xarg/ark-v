import type { Metadata } from "next";
import { Geist_Mono, Instrument_Sans, Inter, Outfit } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arkhv.io";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

/** UI kit buttons — Figma uses Inter Bold 16 / 24 */
const interUi = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["700"],
  display: "swap",
});

/** Web stand-in for Figma “GC Methane” (not on Google Fonts). Swap to local @font-face when licensed. */
const arkDisplay = Outfit({
  subsets: ["latin"],
  variable: "--font-ark-display",
  weight: ["300", "400", "500"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ARKHV — On-Demand Creative Team Subscription",
    template: "%s — ARKHV",
  },
  description:
    "Get unlimited design, motion graphics, and creative work delivered on demand. One flat monthly subscription replaces the need to hire a full creative team.",
  keywords: [
    "creative team subscription",
    "on-demand design",
    "design subscription service",
    "unlimited design requests",
    "motion graphics subscription",
    "creative outsourcing",
    "design as a service",
    "startup design team",
  ],
  authors: [{ name: "ARKHV", url: siteUrl }],
  creator: "ARKHV",
  publisher: "ARKHV",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "ARKHV",
    locale: "en_US",
    url: siteUrl,
    title: "ARKHV — On-Demand Creative Team Subscription",
    description:
      "Get unlimited design, motion graphics, and creative work delivered on demand. One flat monthly subscription replaces the need to hire a full creative team.",
    images: [
      {
        url: "/landing/og-image.png",
        width: 1200,
        height: 630,
        alt: "ARKHV — On-Demand Creative Team",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ARKHV — On-Demand Creative Team Subscription",
    description:
      "Get unlimited design, motion graphics, and creative work delivered on demand. One flat monthly subscription.",
    images: ["/landing/og-image.png"],
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${instrumentSans.variable} ${interUi.variable} ${arkDisplay.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
