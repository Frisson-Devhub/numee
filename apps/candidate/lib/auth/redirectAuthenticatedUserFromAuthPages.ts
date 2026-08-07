import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { frontendRoutes } from "@/constants/frontendRoutes";

/** If a valid session exists, send the user to the dashboard (shared by login routes). */
export async function redirectAuthenticatedUserFromAuthPages() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) return;

  const session = await verifySession(sessionToken);

  if (session && typeof session !== "string" && (session as { id?: string }).id) {
    redirect(frontendRoutes.dashboard);
  }
}
