"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { JobForm, type JobRecord } from "@/components/jobs/JobForm";
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
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2 border-b border-border-default pb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
          Jobs
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Edit job
          </h1>
          <span className="inline-flex items-center rounded-md bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-brand-primary">
            {statusLabel}
          </span>
        </div>
        <p className="max-w-2xl text-sm text-foreground-muted">{job.title}</p>
      </header>
      <JobForm mode="edit" job={job} />
    </div>
  );
}
