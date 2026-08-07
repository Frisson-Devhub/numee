import { cookies } from "next/headers";

const API_ORIGIN = process.env.API_URL || "http://localhost:3001";

/** Minimal profile fields used by server components (header, assistant resume). */
export type ProfileSummary = {
  fullName?: string;
  emailOrPhone?: string;
  linkedInUrl?: string;
  resumeUrl?: string;
  assistantQuestionAnswers?: unknown;
};

/**
 * Server-side fetch to Nest with the session cookie forwarded.
 * Uses `API_URL` (not the browser proxy); returns status 0 on network failure.
 */
export async function fetchApiServer<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const headers = new Headers(init?.headers);
  if (session) {
    headers.set("Cookie", `session=${session}`);
  }
  try {
    const res = await fetch(`${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`, {
      ...init,
      headers,
      cache: "no-store",
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
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/** Load the signed-in user’s profile for RSC; unwraps `{ data }` or bare payload. */
export async function fetchProfileServer(): Promise<ProfileSummary | null> {
  const res = await fetchApiServer<{ data?: ProfileSummary } | ProfileSummary>(
    "/api/user/profile"
  );
  if (!res.ok || !res.data) return null;
  const raw = res.data as { data?: ProfileSummary };
  return (raw.data ?? (res.data as ProfileSummary)) ?? null;
}
