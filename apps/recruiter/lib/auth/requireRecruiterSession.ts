import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, type SessionPayload } from "@/lib/auth";
import { recruiterRoutes } from "@/constants/frontendRoutes";
import { RECRUITER_SESSION_COOKIE } from "@/lib/auth/sessionCookie";

/** Guard for `(app)` layouts: missing/invalid recruiter session cookie redirects to login. */
export async function requireRecruiterSession(): Promise<SessionPayload> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(RECRUITER_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    redirect(recruiterRoutes.login);
  }

  const session = await verifySession(sessionToken);
  if (!session?.id) {
    redirect(recruiterRoutes.login);
  }

  return session;
}
