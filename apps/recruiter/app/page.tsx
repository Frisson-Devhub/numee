import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { recruiterRoutes } from "@/constants/frontendRoutes";

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  if (sessionToken) {
    const session = await verifySession(sessionToken);
    if (session?.id) {
      redirect(recruiterRoutes.dashboard);
    }
  }
  redirect(recruiterRoutes.login);
}
