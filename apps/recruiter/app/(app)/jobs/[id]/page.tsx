"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Chip } from "@numee/shared/components";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { jobStatusChipVariant } from "@/components/jobs/jobStatusChip";
import { apiRoutes } from "@/constants/api";
import { recruiterRoutes } from "@/constants/frontendRoutes";
import { ApiCall } from "@/lib/utils";
import type { JobRecord } from "@/components/jobs/JobForm";

type ApplicationStatus =
  | "APPLIED"
  | "REVIEWING"
  | "SHORTLISTED"
  | "REJECTED"
  | "HIRED";
type ApplicationFilter = "ALL" | ApplicationStatus;

type Applicant = {
  id: string;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    hasResume: boolean;
    hasAssessment: boolean;
  };
};

const applicationStatuses: ApplicationStatus[] = [
  "APPLIED",
  "REVIEWING",
  "SHORTLISTED",
  "REJECTED",
  "HIRED",
];

const applicationFilters: {
  value: ApplicationFilter;
  label: string;
}[] = [
  { value: "ALL", label: "All" },
  ...applicationStatuses.map((status) => ({
    value: status,
    label: formatApplicationStatus(status),
  })),
];

function formatApplicationStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Job overview + applicants tab: status filters, pipeline updates, and
 * publish/close/archive actions for the posting.
 */
export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "candidates">(
    "overview",
  );
  const [applicationFilter, setApplicationFilter] =
    useState<ApplicationFilter>("ALL");
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(true);
  const [applicantsError, setApplicantsError] = useState("");
  const [updatingApplicationId, setUpdatingApplicationId] = useState("");

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setApplicantsLoading(true);
      setApplicantsError("");
      const res = await ApiCall<{ applications?: Applicant[]; error?: string }>({
        url: apiRoutes.recruiter.jobApplications(params.id),
        method: "GET",
      });
      if (cancelled) return;
      setApplicantsLoading(false);
      if (!res.ok) {
        setApplicants([]);
        setApplicantsError(
          res.data?.error ?? res.error ?? "Failed to load applicants",
        );
        return;
      }
      setApplicants(res.data?.applications ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const publish = async () => {
    if (!job) return;
    setBusy(true);
    const res = await ApiCall<{ job?: JobRecord; error?: string }>({
      url: apiRoutes.recruiter.jobPublish(job.id),
      method: "POST",
    });
    setBusy(false);
    if (!res.ok || !res.data?.job) {
      setError(res.data?.error ?? res.error ?? "Publish failed");
      return;
    }
    setJob(res.data.job);
  };

  const close = async () => {
    if (!job || !confirm("Close this job?")) return;
    setBusy(true);
    const res = await ApiCall<{ job?: JobRecord; error?: string }>({
      url: apiRoutes.recruiter.jobClose(job.id),
      method: "POST",
    });
    setBusy(false);
    if (!res.ok || !res.data?.job) {
      setError(res.data?.error ?? res.error ?? "Close failed");
      return;
    }
    setJob(res.data.job);
  };

  const updateApplicationStatus = async (
    applicationId: string,
    status: ApplicationStatus,
  ) => {
    if (!job) return;
    setUpdatingApplicationId(applicationId);
    setApplicantsError("");
    const res = await ApiCall<{
      application?: Pick<Applicant, "id" | "status" | "appliedAt" | "updatedAt">;
      error?: string;
    }>({
      url: apiRoutes.recruiter.jobApplicationStatus(job.id, applicationId),
      method: "PATCH",
      body: { status },
    });
    setUpdatingApplicationId("");
    if (!res.ok || !res.data?.application) {
      setApplicantsError(
        res.data?.error ?? res.error ?? "Failed to update application status",
      );
      return;
    }
    setApplicants((current) =>
      current.map((applicant) =>
        applicant.id === applicationId
          ? { ...applicant, ...res.data!.application! }
          : applicant,
      ),
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-8 h-8 text-brand-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-4">
        <p className="text-danger">{error || "Job not found"}</p>
        <Button
          size="md"
          variant="secondary"
          onClick={() => router.push(recruiterRoutes.jobs)}
        >
          Back to jobs
        </Button>
      </div>
    );
  }

  const stages = Array.isArray(job.pipelineStages)
    ? (job.pipelineStages as string[])
    : [];
  const applicationCounts = applicationStatuses.reduce(
    (counts, status) => ({
      ...counts,
      [status]: applicants.filter((applicant) => applicant.status === status)
        .length,
    }),
    {} as Record<ApplicationStatus, number>,
  );
  const filteredApplicants =
    applicationFilter === "ALL"
      ? applicants
      : applicants.filter(
          (applicant) => applicant.status === applicationFilter,
        );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="rounded-xl border border-border-default bg-surface px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-foreground-subtle">
            <Link href={recruiterRoutes.jobs} className="hover:underline">
              Jobs
            </Link>{" "}
              / Job details
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {job.title}
              </h1>
              <StatusBadge status={job.status} />
            </div>
            <p className="mt-2 text-sm text-foreground-muted">
              {[job.department, job.location, job.employmentType, job.workMode]
                .filter(Boolean)
                .join(" · ") || "Job details"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {job.status !== "CLOSED" && (
              <Link
                href={recruiterRoutes.jobEdit(job.id)}
                className="inline-flex items-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-primary-bright"
              >
                Edit job
              </Link>
            )}
            {job.status === "DRAFT" && (
              <Button
                size="md"
                variant="primary"
                disabled={busy}
                onClick={() => void publish()}
              >
                {busy ? "Publishing…" : "Publish"}
              </Button>
            )}
            {job.status === "PUBLISHED" && (
              <Button
                size="md"
                variant="outline"
                disabled={busy}
                onClick={() => void close()}
              >
                {busy ? "Closing…" : "Close job"}
              </Button>
            )}
          </div>
        </div>
      </header>

      {error && <p className="text-danger text-sm font-medium">{error}</p>}

      <div
        className="flex gap-1 overflow-x-auto border-b border-border-default"
        role="tablist"
        aria-label="Job details sections"
      >
        <TabButton
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
        >
          Job overview
        </TabButton>
        <TabButton
          active={activeTab === "candidates"}
          onClick={() => setActiveTab("candidates")}
        >
          Applied candidates
          <span className="ml-2 rounded-full bg-current/10 px-1.5 py-0.5 text-xs">
            {applicants.length}
          </span>
        </TabButton>
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-5">
          <section className="rounded-xl border border-border-default bg-surface p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">Job details</h2>
            <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Industry">{job.industry?.name || "—"}</Detail>
              <Detail label="Job role">{job.jobRole?.name || "—"}</Detail>
              <Detail label="Experience">
                {job.experienceMin != null || job.experienceMax != null
                  ? `${job.experienceMin ?? "—"}–${job.experienceMax ?? "—"} years`
                  : "—"}
              </Detail>
              <Detail label="Employment type">{job.employmentType || "—"}</Detail>
              <Detail label="Work mode">{job.workMode || "—"}</Detail>
              <Detail label="Notice period">{job.noticePeriod || "—"}</Detail>
              <Detail label="Compensation">
                {job.salaryMin != null || job.salaryMax != null
                  ? `${job.salaryCurrency ?? ""} ${job.salaryMin ?? "—"}–${job.salaryMax ?? "—"}${job.salaryNegotiable ? " (negotiable)" : ""}`
                  : job.salaryNegotiable
                    ? "Negotiable"
                    : "—"}
              </Detail>
              <Detail label="Hiring pipeline">
                {stages.length ? stages.join(" → ") : "—"}
              </Detail>
            </div>
          </section>

          <section className="rounded-xl border border-border-default bg-surface p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">Skills</h2>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(job.skills ?? []).length ? (
                job.skills?.map((skill) => (
                  <Chip key={skill.name} variant="brand" size="sm">
                    {skill.name}
                  </Chip>
                ))
              ) : (
                <p className="text-sm text-foreground-subtle">No skills specified.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border-default bg-surface p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-foreground">Job description</h2>
            {job.description ? (
              <div
                className="rich-text-content mt-4 font-sans text-sm text-foreground"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            ) : (
              <p className="mt-4 text-sm text-foreground-subtle">No description provided.</p>
            )}
          </section>

          <section className="grid gap-5 rounded-xl border border-border-default bg-surface p-5 shadow-sm sm:p-6 lg:grid-cols-3">
            <Detail label="Responsibilities">
              <pre className="whitespace-pre-wrap font-sans text-sm">{job.responsibilities || "—"}</pre>
            </Detail>
            <Detail label="Requirements">
              <pre className="whitespace-pre-wrap font-sans text-sm">{job.requirements || "—"}</pre>
            </Detail>
            <Detail label="Benefits">
              <pre className="whitespace-pre-wrap font-sans text-sm">{job.benefits || "—"}</pre>
            </Detail>
          </section>
        </div>
      ) : (
        <section className="rounded-xl border border-border-default bg-surface shadow-sm">
          <div className="space-y-4 border-b border-border-default px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Applied candidates</h2>
                <p className="mt-1 text-sm text-foreground-muted">Review applicants and update their hiring stage.</p>
              </div>
              <Chip size="sm" variant="neutral" className="text-foreground-muted">
                {applicants.length} total
              </Chip>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {applicationFilters.map((filter) => {
                const count =
                  filter.value === "ALL"
                    ? applicants.length
                    : applicationCounts[filter.value];
                const selected = applicationFilter === filter.value;
                return (
                  <Chip
                    key={filter.value}
                    variant="outline"
                    selected={selected}
                    onClick={() => setApplicationFilter(filter.value)}
                    className="whitespace-nowrap"
                  >
                    {filter.label}
                    <span className="ml-1 tabular-nums opacity-80">{count}</span>
                  </Chip>
                );
              })}
            </div>
          </div>
          <div className="p-5 sm:p-6">
        {applicantsLoading && (
          <div className="flex justify-center py-6">
            <Spinner className="h-6 w-6 text-brand-primary" />
          </div>
        )}
        {applicantsError && (
          <p className="text-danger text-sm font-medium">{applicantsError}</p>
        )}
        {!applicantsLoading &&
          !applicantsError &&
          filteredApplicants.length === 0 && (
            <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted/40 px-5 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                {applicants.length === 0
                  ? "No applications for this job yet."
                  : `No ${formatApplicationStatus(applicationFilter)} candidates.`}
              </p>
              <p className="mt-1 text-sm text-foreground-muted">
                {applicants.length === 0
                  ? "Applications will appear here when candidates apply."
                  : "Try a different status filter to see other applicants."}
              </p>
            </div>
          )}
        {!applicantsLoading && filteredApplicants.length > 0 && (
          <ul className="divide-y divide-border-default overflow-hidden rounded-lg border border-border-default">
            {filteredApplicants.map((applicant) => {
              const candidateName =
                `${applicant.candidate.firstName} ${applicant.candidate.lastName}`.trim() ||
                "Candidate";
              const isUpdating = updatingApplicationId === applicant.id;
              return (
                <li
                  key={applicant.id}
                  className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {candidateName}
                    </p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      Applied {new Date(applicant.appliedAt).toLocaleDateString()}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Chip size="sm" variant="neutral" className="text-foreground-muted">
                        {applicant.candidate.hasAssessment
                          ? "Assessment available"
                          : "No assessment"}
                      </Chip>
                      <Chip size="sm" variant="neutral" className="text-foreground-muted">
                        {applicant.candidate.hasResume
                          ? "Resume available"
                          : "No resume"}
                      </Chip>
                    </div>
                  </div>
                  <label className="flex shrink-0 items-center gap-2 text-xs text-foreground-muted">
                    <span>Stage</span>
                    <select
                      value={applicant.status}
                      disabled={isUpdating}
                      onChange={(event) =>
                        void updateApplicationStatus(
                          applicant.id,
                          event.target.value as ApplicationStatus,
                        )
                      }
                      className="rounded-md border border-border-default bg-background px-2.5 py-1.5 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {applicationStatuses.map((status) => (
                        <option key={status} value={status}>
                          {formatApplicationStatus(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
          </div>
        </section>
      )}
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? "border-brand-primary text-brand-primary"
          : "border-transparent text-foreground-muted hover:border-border-strong hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status?: string }) {
  return (
    <Chip
      size="sm"
      variant={jobStatusChipVariant(status)}
      className="uppercase tracking-wide"
    >
      {status ?? "DRAFT"}
    </Chip>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
        {label}
      </p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}
