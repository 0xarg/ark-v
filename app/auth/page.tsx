"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { landingAssets } from "@/components/landing/assets";
import { CursorGlow } from "@/components/landing/cursor-glow";

const imgStripe = "/landing/stripe-column.png";
const configuredAppOrigin =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";

function getAuthOrigin() {
  if (configuredAppOrigin && /^https?:\/\//i.test(configuredAppOrigin)) {
    return configuredAppOrigin;
  }
  if (typeof window === "undefined") return undefined;
  return window.location.origin;
}

function AuthButton({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const base =
    "inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-full border text-sm font-semibold transition-[background-color,border-color,transform,box-shadow] duration-200 active:scale-[0.97] disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "border-[#E80000] bg-[#E80000] text-white shadow-[0px_10px_30px_rgba(255,0,0,0.25)] hover:bg-[#d40000] hover:-translate-y-px"
      : variant === "secondary"
        ? "border-white/20 bg-white/[0.06] text-white hover:border-white/35 hover:bg-white/[0.1]"
        : "border-transparent bg-transparent text-white/80 hover:text-white";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[base, styles, disabled ? "opacity-60" : ""].join(" ")}
    >
      {children}
    </button>
  );
}

export default function AuthPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const authOrigin = getAuthOrigin();
  const authCallbackUrl = authOrigin
    ? `${authOrigin}/auth/callback?next=/dashboard`
    : undefined;

  const signInWithGoogle = useCallback(async () => {
    if (!authCallbackUrl) return;
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authCallbackUrl },
    });
    if (error) setMessage(error.message);
    setLoading(false);
  }, [authCallbackUrl, supabase]);

  const authWithEmail = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setMessage(error.message);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  }, [email, password, router, supabase]);

  const handleResetPassword = useCallback(async () => {
    if (!email) {
      setMessage("Enter your email first.");
      return;
    }
    if (!authOrigin) {
      setMessage("Unable to determine the app URL. Please try again.");
      return;
    }
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${authOrigin}/auth/callback?next=/auth/change-password`,
    });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "If an account exists for this email, a reset link has been sent.",
      );
    }
    setLoading(false);
  }, [authOrigin, email, supabase]);

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <CursorGlow />
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-[900px]">
            <div className="relative mx-auto h-full w-[1920px] opacity-80">
              {Array.from({ length: 18 }).map((_, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 h-full w-[106px]"
                  style={{ left: 5 + idx * 106 }}
                >
                  <img
                    alt=""
                    src={imgStripe}
                    className="h-full w-full object-cover backdrop-blur-[50px]"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-[140px] h-[420px] w-[980px] -translate-x-1/2 rounded-[999px] bg-[#E80000]/20 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="landing-shell relative flex max-w-[1620px] items-center justify-between gap-3 py-4 sm:py-8"
        >
          <Link href="/" className="landing-link flex items-center">
            <img
              alt="ARKHV"
              src={landingAssets.logoWordmark}
              className="h-5 w-28 sm:h-6 sm:w-32"
            />
          </Link>
          <div className="flex items-center gap-1 rounded-full border border-white/12 bg-white/4 p-1">
            <span className="flex h-9 items-center rounded-full bg-white/10 px-3 text-xs font-medium text-white sm:h-9 sm:px-4 sm:text-sm">
              Login
            </span>
            <Link
              href="/waitlist"
              className="flex h-9 cursor-pointer items-center rounded-full px-3 text-xs font-medium text-white/70 transition-colors hover:text-white sm:h-9 sm:px-4 sm:text-sm"
            >
              Book a demo
            </Link>
          </div>
        </motion.div>

        <div className="landing-shell relative flex w-full max-w-[1620px] flex-col items-center pb-16 pt-4 sm:pb-24 sm:pt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-[500px] rounded-[24px] border border-white/10 p-5 backdrop-blur-[18px] sm:p-8"
          >
            <h1 className="text-center font-(--font-ark-display) text-[clamp(1.95rem,3.4vw,2.4rem)] leading-[1.08]">
              Welcome back
            </h1>
            <p className="landing-subtitle mt-3 text-center text-white/70">
              Login to your ARKHV account to continue.
            </p>

            <form
              className="mt-7 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void authWithEmail();
              }}
            >
              <label className="block">
                <span className="mb-2 block text-sm text-white/80">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  placeholder="you@company.com"
                  className="h-12 w-full rounded-2xl border border-white/12 bg-black/30 px-4 text-base text-white outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-white/40 focus:border-[#E80000]/60 focus:shadow-[0_0_0_3px_rgba(232,0,0,0.12)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-white/80">
                  Password
                </span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  type="password"
                  className="h-12 w-full rounded-2xl border border-white/12 bg-black/30 px-4 text-base text-white outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-white/40 focus:border-[#E80000]/60 focus:shadow-[0_0_0_3px_rgba(232,0,0,0.12)]"
                />
              </label>

              <button
                type="button"
                onClick={() => void handleResetPassword()}
                className="w-full cursor-pointer text-right text-sm text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                Forgot your password?
              </button>

              {message && (
                <p className="pt-2 text-sm text-white/80">{message}</p>
              )}

              <div className="pt-2">
                <AuthButton
                  disabled={loading}
                  onClick={() => void authWithEmail()}
                  variant="primary"
                >
                  Login
                </AuthButton>
              </div>
              <AuthButton
                disabled={true}
                onClick={() => void signInWithGoogle()}
                variant="secondary"
              >
                Login with Google (Coming Soon)
              </AuthButton>

              <div className="pt-4 text-center text-sm text-white/60">
                By continuing you agree to our{" "}
                <Link
                  href="/waitlist"
                  className="landing-link text-white/80 underline-offset-4 hover:text-white hover:underline"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/waitlist"
                  className="landing-link text-white/80 underline-offset-4 hover:text-white hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
