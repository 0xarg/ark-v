"use client";

/* eslint-disable @next/next/no-img-element -- Figma-provided modal illustration uses external assets. */

import { Plus } from "lucide-react";

const LIMIT_MODAL_ILLUSTRATION_ACCENT = "/app/limit-modal-accent.svg";
const LIMIT_MODAL_ILLUSTRATION_INK = "/app/limit-modal-ink.svg";

type RequestLimitReachedModalProps = {
  maxActiveRequests: number;
  onClose: () => void;
  onUpgradePlan: () => void;
  onViewActiveRequests: () => void;
};

export function RequestLimitReachedModal({
  maxActiveRequests,
  onClose,
  onUpgradePlan,
  onViewActiveRequests,
}: RequestLimitReachedModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.2)] backdrop-blur-[5px]">
      <div className="grid min-h-full place-items-center p-4">
        <div className="relative w-full max-w-[500px] rounded-[30px] bg-white px-4 pb-[18px] pt-[18px] sm:px-[26px] sm:pt-[22px]">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-[18px] top-[18px] grid size-8 place-items-center rounded-full border border-[#E6E6E6] bg-[#F6F6F6] text-[#2F3744]"
          >
            <Plus className="size-[18px] rotate-45" />
          </button>

          <div className="relative mx-auto h-[194px] w-[260px]">
            <img
              src={LIMIT_MODAL_ILLUSTRATION_ACCENT}
              alt=""
              className="absolute inset-0 size-full"
            />
            <img
              src={LIMIT_MODAL_ILLUSTRATION_INK}
              alt=""
              className="absolute inset-0 size-full"
            />
          </div>

          <h3 className="mt-2 text-center font-display text-[24px] leading-none text-[#1E1E1E]">
            Request Limit Reached
          </h3>
          <p className="mx-auto mt-3 max-w-[370px] text-center text-[14px] font-medium leading-tight text-[#919191]">
            Your plan allows {maxActiveRequests} active requests at a time.
            <br />
            Complete or archive an existing request before submitting a new one.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onUpgradePlan}
              className="inline-flex h-[42px] items-center justify-center rounded-full bg-[#F5F5F5] px-12 text-[16px] text-[#2F3744]"
            >
              Upgrade Plan
            </button>
            <button
              type="button"
              onClick={onViewActiveRequests}
              className="inline-flex h-[42px] items-center justify-center rounded-full border border-ark-red-500 px-6 text-[14px] text-ark-red-500 shadow-[0px_10px_24px_0px_rgba(255,0,0,0.1)]"
            >
              View Active Requests
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
