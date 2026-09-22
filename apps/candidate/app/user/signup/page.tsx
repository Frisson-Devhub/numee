import SignupForm from "./SignupForm";
import { redirectAuthenticatedUserFromAuthPages } from "@/lib/auth/redirectAuthenticatedUserFromAuthPages";

type Props = {
  searchParams: Promise<{ pendingJob?: string; source?: string }>;
};

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams;
  await redirectAuthenticatedUserFromAuthPages(params.pendingJob);

  return <SignupForm />;
}
