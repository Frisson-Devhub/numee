/** Portal identity used for session cookie namespacing. */
export type AuthPortal = "candidate" | "recruiter" | "admin";

/**
 * Portal-scoped Nest session cookie names.
 * Kept in shared so API setters and frontend readers stay aligned (no secrets).
 */
export const PORTAL_SESSION_COOKIES = {
  candidate: "numee_candidate_session",
  recruiter: "numee_recruiter_session",
  admin: "numee_admin_session",
} as const satisfies Record<AuthPortal, string>;

/** Pre-namespacing cookie; clear on portal login/logout so it does not linger. */
export const LEGACY_SESSION_COOKIE = "session";
