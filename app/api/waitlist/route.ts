import { NextRequest, NextResponse } from "next/server";

import { sendWaitlistWelcomeEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isRecord } from "@/lib/validation";

type Body = { email?: unknown };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (!email || !EMAIL_REGEX.test(email) || email.length > 320) {
    return NextResponse.json(
      { error: "Valid email is required." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  let insertError: { code?: string; message?: string } | null = null;
  if (admin) {
    const { error } = await admin.from("waitlist").insert({ email });
    insertError = error;
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("waitlist").insert({ email });
    insertError = error;
  }

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "You are already on the waitlist." },
        { status: 409 },
      );
    }

    console.error("waitlist insert failed", insertError);
    return NextResponse.json(
      { error: "Could not join waitlist right now." },
      { status: 500 },
    );
  }

  const welcomeResult = await sendWaitlistWelcomeEmail(email);
  if (!welcomeResult.ok) {
    console.error("waitlist welcome email failed", {
      email,
      error: welcomeResult.error,
    });
    return NextResponse.json({
      ok: true,
      state: "saved_email_failed",
      message: "You're on the waitlist. We couldn't send a welcome email yet.",
    });
  }

  return NextResponse.json({
    ok: true,
    state: "joined",
    message: "You're on the waitlist. Check your inbox for a welcome email.",
  });
}
