import { JobForm } from "@/components/jobs/JobForm";

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1 border-b border-border-default pb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
          Jobs
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create job
        </h1>
        <p className="max-w-2xl text-sm text-foreground-muted">
          Build a clear posting with role details, skills, and a polished
          description. Save as draft or publish when ready.
        </p>
      </header>
      <JobForm mode="create" />
    </div>
  );
}
