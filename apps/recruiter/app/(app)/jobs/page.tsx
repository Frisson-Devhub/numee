"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { apiRoutes } from "@/constants/api";
import { recruiterRoutes } from "@/constants/frontendRoutes";
import { ApiCall } from "@/lib/utils";
import type { JobRecord } from "@/components/jobs/JobForm";

const filters = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "CLOSED", label: "Closed" },
] as const;

function statusStyles(status?: string) {
  switch (status) {
    case "PUBLISHED":
      return "bg-success/10 text-success";
    case "CLOSED":
      return "bg-foreground-subtle/15 text-foreground-subtle";
    default:
      return "bg-brand-accent/10 text-brand-accent";
  }
}

/** Company job list with optional status filter (draft / published / closed). */
export default function JobsListPage() {
  const [status, setStatus] = useState("");
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const url = status
        ? `${apiRoutes.recruiter.jobs}?status=${encodeURIComponent(status)}`
        : apiRoutes.recruiter.jobs;
      const res = await ApiCall<{ jobs?: JobRecord[]; error?: string }>({
        url,
        method: "GET",
      });
      if (cancelled) return;
      if (!res.ok) {
        setError(res.data?.error ?? res.error ?? "Failed to load jobs");
        setLoading(false);
        return;
      }
      setJobs(res.data?.jobs ?? []);
      setError("");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Jobs</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Create, enhance, and publish roles for your company.
          </p>
        </div>
        <Link
          href={recruiterRoutes.jobsNew}
          className="inline-flex items-center rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-bright transition-colors"
        >
          New job
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              status === f.value
                ? "bg-brand-primary text-white"
                : "bg-surface border border-border-default text-foreground-muted hover:bg-surface-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-danger text-sm font-medium">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-8 h-8 text-brand-primary" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-surface p-10 text-center">
          <p className="text-foreground-muted">No jobs in this filter yet.</p>
          <Link
            href={recruiterRoutes.jobsNew}
            className="mt-3 inline-block text-sm font-medium text-brand-primary underline"
          >
            Create your first job
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border-default rounded-xl border border-border-default bg-surface overflow-hidden">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={recruiterRoutes.job(job.id)}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-surface-muted transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground">{job.title}</p>
                  <p className="text-xs text-foreground-subtle">
                    {[job.department, job.location, job.employmentType]
                      .filter(Boolean)
                      .join(" · ") || "No details yet"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusStyles(job.status)}`}
                >
                  {job.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
