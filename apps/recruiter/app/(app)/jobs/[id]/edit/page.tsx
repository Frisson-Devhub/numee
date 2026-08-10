"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Chip } from "@numee/shared/components";
import { Spinner } from "@/components/ui/Spinner";
import { JobForm, type JobRecord } from "@/components/jobs/JobForm";
import { jobStatusChipVariant } from "@/components/jobs/jobStatusChip";
import { apiRoutes } from "@/constants/api";
import { ApiCall } from "@/lib/utils";

export default function EditJobPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<JobRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await ApiCall<{ job?: JobRecord; error?: string }>({
        url: apiRoutes.recruiter.job(params.id),
        method: "GET",
      });
      if (cancelled) return;
      if (!res.ok || !res.data?.job) {
        setError(res.data?.error ?? res.error ?? "Job not found");
        setLoading(false);
        return;
      }
      setJob(res.data.job);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8 text-brand-primary" />
      </div>
    );
  }

  if (!job) {
    return <p className="text-danger">{error || "Job not found"}</p>;
  }

  const statusLabel = job.status?.replaceAll("_", " ") ?? "Draft";

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
        <div className="relative space-y-2.5 px-5 py-6 sm:px-7 sm:py-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">
            Jobs
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
              Edit job
            </h1>
            <Chip
              size="sm"
              variant={jobStatusChipVariant(job.status)}
              className="uppercase tracking-wide"
            >
              {statusLabel}
            </Chip>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-foreground-muted">
            {job.title}
          </p>
        </div>
      </header>
      <JobForm mode="edit" job={job} />
    </div>
  );
}
