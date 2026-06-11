import type { AxiosRequestConfig } from "axios";

import { api } from "@/lib/http/client";
import { toApiError } from "@/lib/http/errors";

type ApiEnvelope<T> = { data?: T; error?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getEnvelopeError(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const err = payload.error;
  return typeof err === "string" && err.trim().length > 0 ? err : null;
}

function unwrapEnvelope<T>(payload: unknown): T {
  const envelopeError = getEnvelopeError(payload);
  if (envelopeError) throw new Error(envelopeError);

  if (isRecord(payload) && "data" in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }
  return payload as T;
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  try {
    const res = await api.get(url, config);
    return unwrapEnvelope<T>(res.data);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function apiGetRaw<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const res = await api.get<T>(url, config);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const res = await api.post(url, body, config);
    return unwrapEnvelope<T>(res.data);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const res = await api.patch(url, body, config);
    return unwrapEnvelope<T>(res.data);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function apiDelete<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  try {
    const res = await api.delete(url, { ...config, data: body });
    return unwrapEnvelope<T>(res.data);
  } catch (err) {
    throw toApiError(err);
  }
}

