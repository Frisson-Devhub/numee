import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, type SessionPayload } from "@/lib/auth";
import { recruiterRoutes } from "@/constants/frontendRoutes";

/** Guard for `(app)` layouts: missing/invalid session cookie redirects to login. */
export async function requireRecruiterSession(): Promise<SessionPayload> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    redirect(recruiterRoutes.login);
  }

  const session = await verifySession(sessionToken);
  if (!session?.id) {
    redirect(recruiterRoutes.login);
  }

  return session;
}
