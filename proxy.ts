import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

const DEFAULT_SITE_ORIGIN = 'https://arkhv.com'
const DEFAULT_APP_ORIGIN = 'https://app.arkhv.com'

const APP_ROUTE_PREFIXES = [
  '/auth',
  '/dashboard',
  '/settings',
  '/billing',
  '/subscription',
  '/submit-task',
  '/requests',
  '/brand-asset-library',
]

function normalizeOrigin(input: string | undefined, fallback: string): string {
  const candidate = input?.trim().replace(/\/$/, '') || fallback
  if (!/^https?:\/\//i.test(candidate)) return fallback
  return candidate
}

function getHostname(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase()
  } catch {
    return null
  }
}

function getRequestHostname(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? ''
  const host = forwarded.split(',')[0]?.trim() ?? ''
  return host.split(':')[0]?.toLowerCase() ?? ''
}

function getSiteHostnames(siteHost: string): Set<string> {
  const hosts = new Set<string>()
  hosts.add(siteHost)
  if (siteHost.startsWith('www.')) {
    hosts.add(siteHost.replace(/^www\./, ''))
  } else {
    hosts.add(`www.${siteHost}`)
  }
  return hosts
}

function isAppOwnedPath(pathname: string): boolean {
  return APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function redirectToOrigin(request: NextRequest, targetOrigin: string) {
  const nextUrl = request.nextUrl.clone()
  const target = new URL(targetOrigin)
  nextUrl.protocol = target.protocol
  nextUrl.host = target.host
  return NextResponse.redirect(nextUrl)
}

export async function proxy(request: NextRequest) {
  const siteOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL, DEFAULT_SITE_ORIGIN)
  const appOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL, DEFAULT_APP_ORIGIN)
  const siteHost = getHostname(siteOrigin)
  const appHost = getHostname(appOrigin)
  const requestHost = getRequestHostname(request)
  const pathname = request.nextUrl.pathname

  if (siteHost && appHost && requestHost && siteHost !== appHost) {
    const siteHosts = getSiteHostnames(siteHost)
    if (siteHosts.has(requestHost) && isAppOwnedPath(pathname)) {
      return redirectToOrigin(request, appOrigin)
    }

    const isMarketingPath = pathname === '/' || pathname.startsWith('/waitlist')
    if (requestHost === appHost && isMarketingPath) {
      return redirectToOrigin(request, siteOrigin)
    }
  }

  // update user's auth session
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/dashboard/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}