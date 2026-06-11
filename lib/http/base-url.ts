export function getAppBaseUrl(): string | undefined {
  if (typeof window !== "undefined") return undefined;

  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  if (env && /^https?:\/\//i.test(env)) return env;

  const site = process.env.SITE_URL?.trim().replace(/\/$/, "") ?? "";
  if (site && /^https?:\/\//i.test(site)) return site;

  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, "") ?? "";
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;

  return undefined;
}

