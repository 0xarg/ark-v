import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DEFAULT_FROM = 'ARKHV <no-reply@mail.arkhv.com>';
const SENDING_DOMAIN = 'mail.arkhv.com';

function getResend(): Resend | null {
  if (!RESEND_API_KEY) {
    return null;
  }
  return new Resend(RESEND_API_KEY);
}

/**
 * Send account verification email (e.g. after signup).
 * Link should be the confirmation URL (e.g. with token_hash for Supabase).
 */
export async function sendVerificationEmail(
  to: string,
  options: { confirmLink: string }
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Verify your email</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem;">Verify your email</h1>
  <p>Thanks for signing up for ARKHV. Please confirm your email by clicking the link below.</p>
  <p><a href="${options.confirmLink}" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Confirm email</a></p>
  <p style="color: #666; font-size: 0.875rem;">If you didn't create an account, you can ignore this email.</p>
</body>
</html>`;
  const { error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: [to],
    subject: 'Verify your ARKHV account',
    html,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Send waitlist welcome email.
 */
export async function sendWaitlistWelcomeEmail(
  to: string
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to the ARKHV waitlist</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem;">You're on the waitlist</h1>
  <p>Thanks for joining the ARKHV waitlist.</p>
  <p>We'll reach out as soon as your early access spot is ready.</p>
  <p style="color: #666; font-size: 0.875rem;">If this wasn't you, you can ignore this email.</p>
</body>
</html>`;
  const { error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: [to],
    subject: 'Welcome to the ARKHV waitlist',
    html,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Send password reset email.
 */
export async function sendPasswordResetEmail(
  to: string,
  options: { resetLink: string }
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset your password</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem;">Reset your password</h1>
  <p>We received a request to reset the password for your ARKHV account. Click the link below to set a new password.</p>
  <p><a href="${options.resetLink}" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Reset password</a></p>
  <p style="color: #666; font-size: 0.875rem;">If you didn't request this, you can ignore this email. The link will expire.</p>
</body>
</html>`;
  const { error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: [to],
    subject: 'Reset your ARKHV password',
    html,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Send request status change notification.
 */
export async function sendRequestStatusNotification(
  to: string,
  options: { requestTitle: string; requestId: string; previousStatus: string | null; newStatus: string; dashboardUrl?: string }
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const statusLine = options.previousStatus
    ? `Status changed from <strong>${escapeHtml(options.previousStatus)}</strong> to <strong>${escapeHtml(options.newStatus)}</strong>.`
    : `Status is now <strong>${escapeHtml(options.newStatus)}</strong>.`;
  const dashboardLink = options.dashboardUrl
    ? `<p><a href="${options.dashboardUrl}" style="color: #0066cc;">View in dashboard</a></p>`
    : '';
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Request update</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem;">Request update</h1>
  <p><strong>${escapeHtml(options.requestTitle)}</strong></p>
  <p>${statusLine}</p>
  ${dashboardLink}
  <p style="color: #666; font-size: 0.875rem;">Request ID: ${escapeHtml(options.requestId)}</p>
</body>
</html>`;
  const { error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: [to],
    subject: `ARKHV: Request "${truncate(options.requestTitle, 50)}" – ${options.newStatus}`,
    html,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Notify assignee or operators that a new request was created.
 */
export async function sendRequestCreatedNotification(
  to: string,
  options: { requestTitle: string; requestId: string; dashboardUrl?: string }
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const dashboardLink = options.dashboardUrl
    ? `<p><a href="${options.dashboardUrl}" style="color: #0066cc;">Open dashboard</a></p>`
    : '';
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>New request</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem;">New request</h1>
  <p>A new request was submitted: <strong>${escapeHtml(options.requestTitle)}</strong></p>
  ${dashboardLink}
  <p style="color: #666; font-size: 0.875rem;">Request ID: ${escapeHtml(options.requestId)}</p>
</body>
</html>`;
  const { error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: [to],
    subject: `ARKHV: New request "${truncate(options.requestTitle, 50)}"`,
    html,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Notify stakeholders when someone adds a comment on a request.
 */
export async function sendCommentNotification(
  to: string,
  options: {
    requestTitle: string;
    requestId: string;
    excerpt: string;
    authorLabel?: string;
    dashboardUrl?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }
  const byLine = options.authorLabel
    ? `<p style="color:#444;"><strong>${escapeHtml(options.authorLabel)}</strong> commented:</p>`
    : '<p>New comment:</p>';
  const dashboardLink = options.dashboardUrl
    ? `<p><a href="${options.dashboardUrl}" style="color: #0066cc;">View in dashboard</a></p>`
    : '';
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>New comment</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem;">Comment on request</h1>
  <p><strong>${escapeHtml(options.requestTitle)}</strong></p>
  ${byLine}
  <p style="white-space: pre-wrap; border-left: 3px solid #eee; padding-left: 12px;">${escapeHtml(truncate(options.excerpt, 800))}</p>
  ${dashboardLink}
  <p style="color: #666; font-size: 0.875rem;">Request ID: ${escapeHtml(options.requestId)}</p>
</body>
</html>`;
  const { error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: [to],
    subject: `ARKHV: Comment on "${truncate(options.requestTitle, 45)}"`,
    html,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Payment confirmation email (stub). Call when payment is confirmed.
 */
export async function sendPaymentConfirmation(
  _to: string,
  _options: { amount?: string; description?: string }
): Promise<{ ok: boolean; error?: string }> {
  void _to;
  void _options;
  // Stub: not implemented yet
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + '...';
}

export { DEFAULT_FROM, SENDING_DOMAIN };
