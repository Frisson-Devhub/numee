import LoginForm from "../login/LoginForm";
import { redirectAuthenticatedUserFromAuthPages } from "@/lib/auth/redirectAuthenticatedUserFromAuthPages";

type Props = {
  searchParams: Promise<{ error?: string; pendingJob?: string; source?: string }>;
};

export default async function MobileLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  await redirectAuthenticatedUserFromAuthPages(params.pendingJob);

  return <LoginForm errorFromQuery={params.error} variant="mobile" />;
}
