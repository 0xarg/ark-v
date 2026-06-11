"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { landingAssets } from "@/components/landing/assets";

function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const changePassword = useCallback(async () => {
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({
      password,
    });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password updated. Redirecting to dashboard...");
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  }, [password, router, supabase]);

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="landing-shell flex min-h-screen flex-col items-center justify-center py-10">
        <Link href="/" className="landing-link mb-10 inline-flex">
          <img alt="ARKHV" src={landingAssets.logoWordmark} className="h-7 w-auto" />
        </Link>

        <div className="w-full max-w-[460px] rounded-[24px] border border-white/12 bg-white/4 p-8 shadow-[0px_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-[18px]">
          <h1 className="text-center font-(--font-ark-display) text-[2rem] leading-[1.1]">
            Create a new password
          </h1>
          <p className="landing-subtitle mt-3 text-center text-white/70">
            Enter a strong password to secure your account.
          </p>

          <form
            className="mt-7 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void changePassword();
            }}
          >
            <label className="block">
              <span className="mb-2 block text-sm text-white/80">New password</span>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-2xl border border-white/12 bg-black/30 px-4 text-base text-white outline-none transition-colors placeholder:text-white/40 focus:border-[#E80000]/60"
                placeholder="At least 6 characters"
              />
            </label>

            {message && <p className="text-sm text-white/80">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-full border border-[#E80000] bg-[#E80000] text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#d40000] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Change Password
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default ChangePasswordPage;
