export { formatLevel } from "./format";

/** Format a duration as `m:ss` (e.g. OTP countdown). */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Two-letter initials from full name, or from email/phone as fallback. */
export function getUserInitials(fullName: string, emailOrPhone = ""): string {
  const trimmed = fullName.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  if (emailOrPhone) return emailOrPhone.slice(0, 2).toUpperCase();
  return "—";
}

/** Options for the shared cookie-aware fetch helper. */
export type ApiCallOptions = {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown> | FormData;
  headers?: Record<string, string>;
};

/** Normalized result from ApiCall — never throws; network failures use status 0. */
export type ApiCallResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
};

/**
 * Prefer relative `/api/...` URLs so Vite/Next dev proxies keep cookies same-origin.
 * Absolute URLs are passed through unchanged.
 */
export async function ApiCall<T = unknown>(options: ApiCallOptions): Promise<ApiCallResult<T>> {
  const { url, method = "GET", body, headers = {} } = options;
  const isFormData = body instanceof FormData;
  const requestHeaders: Record<string, string> = { ...headers };
  if (!isFormData) {
    requestHeaders["Content-Type"] = "application/json";
  }
  try {
    const res = await fetch(url, {
      method,
      headers: requestHeaders,
      credentials: "include",
      ...(body !== undefined && {
        body: isFormData ? body : JSON.stringify(body),
      }),
    });
    const text = await res.text();
    let data: T | null = null;
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = text as unknown as T;
      }
    }
    const errorPayload = data as { error?: string } | null;
    return {
      ok: res.ok,
      status: res.status,
      data,
      error: res.ok ? null : errorPayload?.error ?? "Request failed",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return { ok: false, status: 0, data: null, error: message };
  }
}
