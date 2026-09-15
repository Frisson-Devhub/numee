import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { CANDIDATE_SESSION_COOKIE } from "@/lib/auth/sessionCookie";
import { fetchProfileServer } from "@/lib/api-server";

export default async function QuestionnaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CANDIDATE_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    redirect("/login?redirectTo=questionnaire");
  }

  const session = await verifySession(sessionToken);
  if (!session || typeof session !== "object" || !("id" in session) || typeof (session as { id: unknown }).id !== "string") {
    redirect("/login?redirectTo=questionnaire");
  }

  const profile = await fetchProfileServer();
  // Resume is mandatory; a LinkedIn URL alone no longer completes the social step.
  if (!profile?.resumeUrl?.trim()) {
    redirect("/user/signup/social");
  }

  return <>{children}</>;
}
