"use client";

import { FormEvent, useState } from "react";

import { toUserMessage } from "@/lib/http/errors";
import { apiPost } from "@/lib/http/request";

type WaitlistResponse = {
  ok: boolean;
  state: "joined" | "saved_email_failed";
  message: string;
};

type WaitlistEmailFormProps = {
  variant?: "stacked" | "inline";
  placeholder?: string;
  submitLabel?: string;
  className?: string;
  showStatusMessage?: boolean;
  onSuccess?: (message: string) => void;
};

export function WaitlistEmailForm({
  variant = "stacked",
  placeholder = "Enter your email",
  submitLabel = "Join Waitlist",
  className = "",
  showStatusMessage = true,
  onSuccess,
}: WaitlistEmailFormProps = {}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage(null);
    setStatus("idle");

    try {
      const response = await apiPost<WaitlistResponse>("/api/waitlist", { email });
      setStatus("success");
      setMessage(response.message);
      onSuccess?.(response.message);
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(toUserMessage(error, "Could not join waitlist right now."));
    } finally {
      setLoading(false);
    }
  }

  const isInline = variant === "inline";

  return (
    <form
      className={[
        isInline
          ? "mx-auto mt-10 flex w-full max-w-[620px] flex-col items-center px-0 sm:px-0"
          : "mx-auto mt-[48px] flex w-full max-w-[795px] flex-col items-center",
        className,
      ].join(" ")}
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <label className="sr-only" htmlFor="waitlist-email">
        Email
      </label>
      <div
        className={
          isInline
            ? "relative w-full rounded-[300px] border-[1.5px] border-white/20 bg-transparent p-1"
            : "relative w-full rounded-[100px] border border-white/10 bg-white/5 p-1 shadow-[0px_4px_14px_rgba(0,0,0,0.04)]"
        }
      >
        <input
          id="waitlist-email"
          type="email"
          name="email"
          placeholder={placeholder}
          autoComplete={isInline ? "off" : "email"}
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (message) setMessage(null);
            if (status !== "idle") setStatus("idle");
          }}
          className={
            isInline
              ? "waitlist-inline-input-autofill h-[46px] w-full rounded-[300px] bg-[#0F1012] px-4 pr-[122px] text-[15px] text-[#D0D0D0] outline-none placeholder:text-[#D0D0D0]/50 focus-visible:ring-0 sm:h-[50px] sm:px-5 sm:pr-[150px] sm:text-[16px]"
              : "landing-input text-center text-[#D0D0D0] placeholder:text-[#D0D0D0]/35"
          }
          disabled={loading}
        />
        {isInline ? (
          <button
            type="submit"
            disabled={loading}
            className="landing-pill-btn absolute right-[4px] top-[4px] h-[46px] min-w-[110px] cursor-pointer border-ark-red-600 bg-ark-red-600 px-4 text-sm text-white shadow-[0px_0px_30px_rgba(255,0,0,0.75)] hover:bg-[#d40000] disabled:cursor-not-allowed disabled:opacity-70 sm:h-[50px] sm:min-w-[126px] sm:px-5 sm:text-base"
          >
            {loading ? "Joining..." : submitLabel}
          </button>
        ) : null}
      </div>
      {!isInline ? (
        <div className="mt-5">
          <button
            type="submit"
            disabled={loading}
            className="landing-pill-btn landing-pill-btn-primary min-w-[230px] cursor-pointer text-white hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Joining..." : submitLabel}
          </button>
        </div>
      ) : null}
      {showStatusMessage && message && (
        <p
          className={`mt-4 text-center text-sm ${
            status === "error" ? "text-red-300" : "text-white/80"
          }`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
