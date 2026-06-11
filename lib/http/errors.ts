import type { AxiosError } from "axios";

import { isRecord } from "@/lib/validation";

export type ApiError = Error & {
  status?: number;
  code?: string;
  details?: unknown;
};

export function toApiError(error: unknown, fallbackMessage = "Request failed"): ApiError {
  if (error instanceof Error && (error as AxiosError).isAxiosError) {
    const ax = error as AxiosError<unknown>;
    const apiError: ApiError = ax;
    apiError.status = ax.response?.status;

    const data = ax.response?.data;
    if (isRecord(data) && typeof data.error === "string" && data.error.trim()) {
      apiError.message = data.error;
      apiError.details = data;
    }

    return apiError;
  }

  if (error instanceof Error) return error as ApiError;
  const e = new Error(fallbackMessage) as ApiError;
  e.details = error;
  return e;
}

export function toUserMessage(error: unknown, fallback = "Something went wrong"): string {
  const e = toApiError(error, fallback);
  return e.message?.trim() ? e.message : fallback;
}

