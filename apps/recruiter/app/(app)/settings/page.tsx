import Link from "next/link";
import { requireRecruiterSession } from "@/lib/auth/requireRecruiterSession";
import { recruiterRoutes } from "@/constants/frontendRoutes";

export default async function SettingsPage() {
  const session = await requireRecruiterSession();

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Account basics for your recruiter workspace.
        </p>
      </div>

      <section className="rounded-xl border border-border-default bg-surface p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Account</h2>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
            Email
          </p>
          <p className="mt-1 text-sm text-foreground">
            {session.email || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
            User id
          </p>
          <p className="mt-1 text-sm text-foreground break-all">
            {session.id || "—"}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border-default bg-surface p-6 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Security</h2>
        <p className="text-sm text-foreground-muted">
          To change your password, use the forgot-password flow from the login
          page.
        </p>
        <Link
          href={recruiterRoutes.forgotPassword}
          className="inline-flex text-sm font-medium text-brand-primary underline"
        >
          Reset password
        </Link>
      </section>

      <section className="rounded-xl border border-border-default bg-surface p-6 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Workspace</h2>
        <div className="flex flex-col gap-2 text-sm">
          <Link
            href={recruiterRoutes.company}
            className="text-brand-primary underline"
          >
            Company profile
          </Link>
          <Link
            href={recruiterRoutes.team}
            className="text-brand-primary underline"
          >
            Team members
          </Link>
        </div>
      </section>
    </div>
  );
}
