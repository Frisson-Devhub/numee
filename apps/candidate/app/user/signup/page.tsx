import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import SignupForm from "./SignupForm";
import { frontendRoutes } from "@/constants/frontendRoutes";

export default async function SignupPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (sessionToken) {
    const session = await verifySession(sessionToken);
    if (session) {
      redirect(frontendRoutes.dashboard);
    }
  }

  return <SignupForm />;
}
