import { JobForm } from "@/components/jobs/JobForm";

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="relative overflow-hidden rounded-xl border border-border-default bg-surface shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-primary/[0.07] via-transparent to-auth-panel-accent/10"
        />
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-primary to-brand-primary-bright"
        />
        <div className="relative space-y-2 px-5 py-6 sm:px-7 sm:py-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">
            Jobs
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
            Create job
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-foreground-muted">
            Fill in the basics, then create a polished job description with AI.
            Save as draft or publish when ready.
          </p>
        </div>
      </header>
      <JobForm mode="create" />
    </div>
  );
}
