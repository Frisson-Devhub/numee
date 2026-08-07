import SignupForm from "./SignupForm";
import { redirectAuthenticatedUserFromAuthPages } from "@/lib/auth/redirectAuthenticatedUserFromAuthPages";

export default async function SignupPage() {
  await redirectAuthenticatedUserFromAuthPages();
  return <SignupForm />;
}
