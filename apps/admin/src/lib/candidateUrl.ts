/** Candidate app origin for auth redirects (login / after sign-out). */
export function getCandidateUrl(): string {
  const url = import.meta.env.VITE_CANDIDATE_URL || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

/** Absolute candidate login URL used after admin sign-out (shared session cookie). */
export function candidateLoginUrl(): string {
  return `${getCandidateUrl()}/user/login`;
}
