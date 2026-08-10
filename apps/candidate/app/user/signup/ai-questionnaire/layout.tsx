import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { CANDIDATE_SESSION_COOKIE } from "@/lib/auth/sessionCookie";
import { frontendRoutes } from "@/constants/frontendRoutes";

export default async function AIQuestionnaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CANDIDATE_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    redirect(`${frontendRoutes.login}?redirectTo=ai-questionnaire`);
  }

  const session = await verifySession(sessionToken);
  if (!session || typeof session !== "object" || !("id" in session) || typeof (session as { id: unknown }).id !== "string") {
    redirect(`${frontendRoutes.login}?redirectTo=ai-questionnaire`);
  }

  return <>{children}</>;
}
