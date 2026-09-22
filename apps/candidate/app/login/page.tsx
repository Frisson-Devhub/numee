import LoginForm from "@/app/user/login/LoginForm";
import { redirectAuthenticatedUserFromAuthPages } from "@/lib/auth/redirectAuthenticatedUserFromAuthPages";

type Props = {
  searchParams: Promise<{ error?: string; pendingJob?: string; source?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  await redirectAuthenticatedUserFromAuthPages(params.pendingJob);

  return <LoginForm errorFromQuery={params.error} />;
}
