import LoginForm from "@/app/user/login/LoginForm";
import { redirectAuthenticatedUserFromAuthPages } from "@/lib/auth/redirectAuthenticatedUserFromAuthPages";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  await redirectAuthenticatedUserFromAuthPages();

  const { error: queryError } = await searchParams;
  return <LoginForm errorFromQuery={queryError} />;
}
