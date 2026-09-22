import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { frontendRoutes } from "@/constants/frontendRoutes";
import { CANDIDATE_SESSION_COOKIE } from "@/lib/auth/sessionCookie";

/**
 * If a valid candidate session exists, send the user to the dashboard
 * (or a pending shared job when `pendingJob` is in the login/signup URL).
 */
export async function redirectAuthenticatedUserFromAuthPages(pendingJob?: string) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CANDIDATE_SESSION_COOKIE)?.value;

  if (!sessionToken) return;

  const session = await verifySession(sessionToken);

  if (session && typeof session !== "string" && (session as { id?: string }).id) {
    const jobId = pendingJob?.trim();
    redirect(
      jobId ? `/user/jobs/${encodeURIComponent(jobId)}` : frontendRoutes.dashboard,
    );
  }
}
