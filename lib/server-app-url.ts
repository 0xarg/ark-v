import type { NextRequest } from 'next/server';

/**
 * Absolute origin for links in emails (confirm, reset). Prefer env in production.
 */
export function getPublicAppOrigin(request: NextRequest): string | null {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') ?? '';
  if (env && /^https?:\/\//i.test(env)) {
    return env;
  }
  const site = process.env.SITE_URL?.trim().replace(/\/$/, '') ?? '';
  if (site && /^https?:\/\//i.test(site)) {
    return site;
  }
  if (process.env.NODE_ENV === 'development') {
    const origin = request.headers.get('origin');
    if (origin && /^https?:\/\//i.test(origin)) {
      return origin.replace(/\/$/, '');
    }
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    const proto =
      request.headers.get('x-forwarded-proto') ??
      (host?.includes('localhost') ? 'http' : 'https');
    if (host) {
      return `${proto}://${host.replace(/\/$/, '')}`;
    }
  }
  return null;
}
