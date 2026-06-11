import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://arkhv.io";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/waitlist"],
        disallow: [
          "/dashboard",
          "/settings",
          "/billing",
          "/subscription",
          "/my-requests",
          "/my-tasks",
          "/submit-request",
          "/submit-task",
          "/brand-asset-library",
          "/help-center",
          "/designs",
          "/requests",
          "/auth/callback",
          "/auth/change-password",
          "/auth/confirm",
          "/api/",
          "/design-system/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
