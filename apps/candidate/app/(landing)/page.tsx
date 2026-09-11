import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { frontendRoutes } from "@/constants/frontendRoutes";
import { verifySession } from "@/lib/auth";
import { CANDIDATE_SESSION_COOKIE } from "@/lib/auth/sessionCookie";
import LandingPage from "@/components/landing/LandingPage";

export default async function Home() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CANDIDATE_SESSION_COOKIE)?.value;

  if (sessionToken) {
    const session = await verifySession(sessionToken);

    if (session && typeof session !== "string" && session.id) {
      redirect(frontendRoutes.dashboard);
    }
  }

  return (
    <main>
      <LandingPage />
    </main>
  );
}
