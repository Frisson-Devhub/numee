import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireRecruiterSession } from "@/lib/auth/requireRecruiterSession";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRecruiterSession();
  return (
    <DashboardShell userEmail={session.email}>{children}</DashboardShell>
  );
}
