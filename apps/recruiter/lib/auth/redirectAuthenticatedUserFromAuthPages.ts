import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { recruiterRoutes } from "@/constants/frontendRoutes";
import { RECRUITER_SESSION_COOKIE } from "@/lib/auth/sessionCookie";

/** If a valid recruiter session exists, send the recruiter to the dashboard. */
export async function redirectAuthenticatedUserFromAuthPages() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(RECRUITER_SESSION_COOKIE)?.value;

  if (!sessionToken) return;

  const session = await verifySession(sessionToken);

  if (session?.id) {
    redirect(recruiterRoutes.dashboard);
  }
}
