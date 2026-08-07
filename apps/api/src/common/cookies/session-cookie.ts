import type { CookieOptions, Response } from "express";

/** Cookie name shared by Nest session setters and frontend readers. */
export const SESSION_COOKIE = "session";
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

/** Attach the signed session JWT as the session cookie. */
export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

/** Expire/clear the session cookie. */
export function clearSessionCookie(res: Response): void {
  res.cookie(SESSION_COOKIE, "", sessionCookieOptions({ maxAge: 0 }));
}
