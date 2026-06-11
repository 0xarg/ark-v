import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPublicAppOrigin } from "@/lib/server-app-url";
import { isRecord } from "@/lib/validation";

type Body = { email?: unknown; password?: unknown };

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    const parsed: unknown = await request.json();
    body = isRecord(parsed) ? parsed : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Valid email is required" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  // Optional server-only check (service role) to return a clean 409.
  // WARNING: never expose this check client-side (account enumeration).
  const admin = createAdminClient();
  if (admin) {
    const { data: exists, error: existsErr } = await admin.rpc(
      "auth_email_exists",
      { p_email: email },
    );
    if (!existsErr && exists === true) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try signing in." },
        { status: 409 },
      );
    }
  }

  const origin = getPublicAppOrigin(request);
  if (!origin) {
    return NextResponse.json(
      {
        error:
          "Set NEXT_PUBLIC_APP_URL (or SITE_URL) to your site origin so confirmation links work.",
      },
      { status: 500 },
    );
  }

  // After the user clicks the email confirmation link, Supabase will redirect
  // back to this URL with a `code` that `/auth/callback` exchanges for a session.
  const emailRedirectTo = `${origin}/auth/callback?next=/dashboard`;

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });

  if (error) {
    const msg = error.message ?? "Could not create account";

    return NextResponse.json(
      {
        error: msg,
      },
      { status: 400 },
    );
  }

  // `session` is usually null until email is confirmed (depending on Supabase settings).
  // We intentionally do not create the profile here; `/auth/callback` does it once the
  // session exists.
  return NextResponse.json({ ok: true, user_id: data.user?.id ?? null });
}
