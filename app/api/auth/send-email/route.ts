import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'standardwebhooks';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email';

const HOOK_SECRET = process.env.SUPABASE_AUTH_HOOK_SECRET;

/**
 * Supabase Auth Hook (Send Email): receives auth events and sends transactional
 * emails via Resend. Configure this URL in Supabase Dashboard > Auth > Hooks >
 * Send Email Hook.
 *
 * Payload: { user: { id, email, ... }, email_data: { token_hash, redirect_to, email_action_type, site_url, ... } }
 * When SUPABASE_AUTH_HOOK_SECRET is set, requests are verified via Standard Webhooks (webhook-id, webhook-timestamp, webhook-signature headers).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let body: { user?: { email?: string }; email_data?: { token_hash?: string; redirect_to?: string; email_action_type?: string; site_url?: string } };

  if (HOOK_SECRET) {
    const base64Secret = HOOK_SECRET.replace(/^v1[,.]whsec_/i, '');
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    try {
      const wh = new Webhook(base64Secret);
      const verified = wh.verify(rawBody, headers) as typeof body;
      if (verified != null) body = verified;
      else body = {};
    } catch (err) {
      console.error('Send email hook verification failed', err);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  }

  const user = body?.user;
  const emailData = body?.email_data;
  const to = typeof user?.email === 'string' ? user.email : null;

  if (!to || !emailData) {
    return NextResponse.json({ error: 'Missing user.email or email_data' }, { status: 400 });
  }

  const { token_hash, redirect_to, email_action_type, site_url } = emailData;

  const fromEnv =
    typeof process.env.NEXT_PUBLIC_APP_URL === 'string'
      ? process.env.NEXT_PUBLIC_APP_URL.trim()
      : '';
  const siteUrlFromHook = typeof site_url === 'string' ? site_url.trim() : '';
  const siteUrlServer = typeof process.env.SITE_URL === 'string' ? process.env.SITE_URL.trim() : '';

  let baseUrl = fromEnv || siteUrlServer || siteUrlFromHook;
  baseUrl = baseUrl.replace(/\/$/, '');

  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
    console.error(
      'Auth email hook: no absolute app URL. Set NEXT_PUBLIC_APP_URL or SITE_URL (e.g. https://app.example.com). site_url from hook:',
      siteUrlFromHook || '(empty)'
    );
    return NextResponse.json(
      {
        error:
          'Server misconfiguration: set NEXT_PUBLIC_APP_URL or SITE_URL to your deployed app origin so confirmation links work in email.',
      },
      { status: 500 }
    );
  }

  const redirectTo =
    typeof redirect_to === 'string' && redirect_to.length > 0
      ? redirect_to
      : `${baseUrl}/dashboard`;
  const tokenHash = typeof token_hash === 'string' ? token_hash : '';

  if (!tokenHash) {
    console.error('Auth email hook: missing token_hash', { email_action_type });
    return NextResponse.json({ error: 'Missing token_hash in email_data' }, { status: 400 });
  }

  // Build link that Supabase will accept for confirm/recover (auth/confirm with token_hash)
  const confirmPath = '/auth/confirm';
  const params = new URLSearchParams();
  params.set('token_hash', tokenHash);
  if (email_action_type) params.set('type', email_action_type);
  params.set('next', redirectTo);
  const confirmLink = `${baseUrl}${confirmPath}?${params.toString()}`;

  const actionType = typeof email_action_type === 'string' ? email_action_type : '';

  const isSignupLike =
    actionType === 'signup' ||
    actionType === 'invite' ||
    actionType === 'magiclink' ||
    actionType === 'email';

  if (isSignupLike) {
    const result = await sendVerificationEmail(to, { confirmLink });
    if (!result.ok) {
      console.error('Resend verification email failed', { to, error: result.error, actionType });
      return NextResponse.json({ error: result.error ?? 'Failed to send' }, { status: 500 });
    }
    return NextResponse.json({});
  }

  if (actionType === 'recovery') {
    const result = await sendPasswordResetEmail(to, { resetLink: confirmLink });
    if (!result.ok) {
      console.error('Resend password reset email failed', { to, error: result.error });
      return NextResponse.json({ error: result.error ?? 'Failed to send' }, { status: 500 });
    }
    return NextResponse.json({});
  }

  if (actionType === 'email_change' || actionType === 'reauthentication') {
    const result = await sendVerificationEmail(to, { confirmLink });
    if (!result.ok) {
      console.error('Resend auth action email failed', { to, error: result.error, actionType });
      return NextResponse.json({ error: result.error ?? 'Failed to send' }, { status: 500 });
    }
    return NextResponse.json({});
  }

  console.warn('Auth email hook: unhandled email_action_type, no email sent', { actionType });
  return NextResponse.json({});
}
