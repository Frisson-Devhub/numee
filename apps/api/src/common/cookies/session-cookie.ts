import type { CookieOptions, Response } from "express";
import {
  LEGACY_SESSION_COOKIE,
  PORTAL_SESSION_COOKIES,
  type AuthPortal,
} from "@numee/shared/server";

export type { AuthPortal };
export { LEGACY_SESSION_COOKIE, PORTAL_SESSION_COOKIES };

/** Session cookie max-age (24h); keep aligned with JWT `expiresIn`. */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24; // 24 hours

/** Default httpOnly session cookie options (secure in production). */
export function sessionCookieOptions(overrides?: CookieOptions): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SEC * 1000,
    path: "/",
    sameSite: "lax",
    ...overrides,
  };
}

/**
 * Map a request path to the portal whose session cookie should be used.
 * Matches Nest global prefix (`/api/...`) and bare controller paths.
 */
export function resolvePortalFromPath(path: string): AuthPortal {
  const normalized = (path.split("?")[0] ?? path).replace(/\/+$/, "") || "/";
  if (
    normalized.startsWith("/api/admin") ||
    normalized === "/admin" ||
    normalized.startsWith("/admin/")
  ) {
    return "admin";
  }
  if (
    normalized.startsWith("/api/recruiter") ||
    normalized === "/recruiter" ||
    normalized.startsWith("/recruiter/")
  ) {
    return "recruiter";
  }
  return "candidate";
}

/** Expire the legacy `session` cookie so pre-namespace browsers do not keep a stale session. */
export function clearLegacySessionCookie(res: Response): void {
  res.cookie(LEGACY_SESSION_COOKIE, "", sessionCookieOptions({ maxAge: 0 }));
}

/** Attach a signed session JWT as the portal-specific httpOnly cookie. */
export function setPortalSessionCookie(
  res: Response,
  portal: AuthPortal,
  token: string,
): void {
  res.cookie(PORTAL_SESSION_COOKIES[portal], token, sessionCookieOptions());
  clearLegacySessionCookie(res);
}

/** Clear only the given portal’s session cookie (and legacy `session`). */
export function clearPortalSessionCookie(
  res: Response,
  portal: AuthPortal,
): void {
  res.cookie(
    PORTAL_SESSION_COOKIES[portal],
    "",
    sessionCookieOptions({ maxAge: 0 }),
  );
  clearLegacySessionCookie(res);
}
