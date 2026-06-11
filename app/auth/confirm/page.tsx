'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiPost } from '@/lib/http/request';
import { landingAssets } from '@/components/landing/assets';

function resolvePostConfirmPath(next: string): string {
  if (!next || next === '/') return '/dashboard';
  if (next.startsWith('/')) return next;
  try {
    const u = new URL(next);
    if (typeof window !== 'undefined' && u.origin === window.location.origin) {
      const path = `${u.pathname}${u.search}${u.hash}`;
      return path || '/dashboard';
    }
    const path = `${u.pathname}${u.search}${u.hash}`;
    return path || '/dashboard';
  } catch {
    return '/dashboard';
  }
}

/**
 * Handles email confirmation links (signup verification, password reset).
 * URL: /auth/confirm?token_hash=...&type=signup|recovery&next=...
 * After verifyOtp, redirects to next or /dashboard.
 */
function AuthConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const run = useCallback(async () => {
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type') ?? 'signup';
    const next = searchParams.get('next') ?? '/dashboard';

    if (!tokenHash) {
      setStatus('error');
      setMessage('Missing confirmation link.');
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as
        | 'signup'
        | 'recovery'
        | 'email_change'
        | 'magiclink'
        | 'invite'
        | 'email',
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    try {
      await apiPost('/api/profile/ensure');
    } catch {
      /* non-fatal */
    }

    setStatus('success');
    setMessage(type === 'recovery' ? 'Redirecting to set new password...' : 'Email confirmed. Redirecting...');
    const nextPath = resolvePostConfirmPath(next);
    router.replace(nextPath);
    router.refresh();
  }, [searchParams, supabase, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void run();
  }, [run]);

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="landing-shell flex min-h-screen flex-col items-center justify-center py-10">
        <Link href="/" className="landing-link mb-10 inline-flex">
          <img alt="ARKHV" src={landingAssets.logoWordmark} className="h-7 w-auto" />
        </Link>

        <div className="w-full max-w-[460px] rounded-[24px] border border-white/12 bg-white/4 p-8 text-center shadow-[0px_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-[18px]">
          <h1 className="font-(--font-ark-display) text-[2rem] leading-[1.1]">
            Confirm your account
          </h1>

          {status === 'loading' && (
            <p className="landing-subtitle mt-3 text-white/70">Confirming your secure link...</p>
          )}
          {status === 'success' && (
            <p className="landing-subtitle mt-3 text-white/80">{message}</p>
          )}
          {status === 'error' && (
            <>
              <p className="landing-subtitle mt-3 text-red-300">{message}</p>
              <Link
                href="/auth"
                className="landing-pill-btn landing-pill-btn-secondary-dark mt-6 w-full"
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function ConfirmFallback() {
  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="landing-shell flex min-h-screen items-center justify-center py-10">
        <div className="w-full max-w-[460px] rounded-[24px] border border-white/12 bg-white/4 p-8 text-center shadow-[0px_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-[18px]">
          <h1 className="font-(--font-ark-display) text-[2rem] leading-[1.1]">
            Confirm your account
          </h1>
          <p className="landing-subtitle mt-3 text-white/70">Confirming your secure link...</p>
        </div>
      </div>
    </main>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<ConfirmFallback />}>
      <AuthConfirmContent />
    </Suspense>
  );
}
