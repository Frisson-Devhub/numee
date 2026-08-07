"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import sanitizeHtml from "sanitize-html";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  Clock3,
  DollarSign,
  MapPin,
} from "lucide-react";
import { apiRoutes } from "@/constants/api";
import { DASHBOARD_CARD_CLASS } from "@/constants/constants";
import { GradientButton } from "@/components/ui/GradientButton";
import { Spinner } from "@/components/ui/Spinner";
import { getMatchPresentation } from "@/lib/job-match";
import { ApiCall } from "@/lib/utils";

type JobDetail = {
  id: string;
  title: string;
  department: string | null;
  employmentType: string | null;
  workMode: string | null;
  location: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  noticePeriod: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryNegotiable: boolean;
  description: string | null;
  responsibilities: string | null;
  requirements: string | null;
  benefits: string | null;
  company: {
    id: string;
    name: string;
    website: string | null;
    logoUrl: string | null;
    location: string | null;
  };
  industry: { id: string; name: string } | null;
  jobRole: { id: string; name: string } | null;
  skills: Array<{ id: string; name: string; required: boolean }>;
  hasApplied: boolean;
  applicationStatus: string | null;
  appliedAt: string | null;
};

const JOB_RICH_TEXT_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
];

/** Allowlist TipTap HTML from recruiter job posts before `dangerouslySetInnerHTML`. */
function sanitizeJobRichText(html: string | null): string {
  if (!html) return "";

  return sanitizeHtml(html, {
    allowedTags: JOB_RICH_TEXT_TAGS,
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  }).trim();
}

function jobSalary(job: JobDetail): string | null {
  if (job.salaryNegotiable) return "Salary negotiable";
  const currency = job.salaryCurrency ? `${job.salaryCurrency} ` : "";
  if (job.salaryMin != null && job.salaryMax != null) {
    return `${currency}${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()}`;
  }
  if (job.salaryMin != null) return `From ${currency}${job.salaryMin.toLocaleString()}`;
  if (job.salaryMax != null) return `Up to ${currency}${job.salaryMax.toLocaleString()}`;
  return null;
}

/**
 * Job detail + apply. Optional `?match=` query carries the raw Qdrant score for
 * the badge (not re-fetched here).
 */
export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const jobId = params.id;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const match = useMemo(() => {
    const rawScore = searchParams.get("match");
    return rawScore === null ? null : getMatchPresentation(Number(rawScore));
  }, [searchParams]);

  const loadJob = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    const res = await ApiCall<{ job?: JobDetail; error?: string }>({
      url: apiRoutes.user.job(jobId),
      method: "GET",
    });
    setLoading(false);
    if (!res.ok || !res.data?.job) {
      setError(res.data?.error ?? res.error ?? "Failed to load this job");
      return;
    }
    setJob(res.data.job);
  }, [jobId]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

  const apply = async () => {
    if (!job || job.hasApplied) return;
    setApplying(true);
    setApplyError(null);
    const res = await ApiCall<{
      success?: boolean;
      alreadyApplied?: boolean;
      application?: { status: string; appliedAt: string };
      error?: string;
    }>({
      url: apiRoutes.user.jobApply(job.id),
      method: "POST",
    });
    setApplying(false);
    if (!res.ok || !res.data?.success) {
      setApplyError(res.data?.error ?? res.error ?? "Could not submit your application");
      return;
    }
    setJob((current) =>
      current
        ? {
            ...current,
            hasApplied: true,
            applicationStatus: res.data?.application?.status ?? "APPLIED",
            appliedAt: res.data?.application?.appliedAt ?? new Date().toISOString(),
          }
        : current,
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-[#205ec5]" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <Link href="/user/jobs" className="inline-flex items-center gap-2 text-sm font-medium text-[#205ec5] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </Link>
        <div className={`${DASHBOARD_CARD_CLASS} mt-5`}>
          <h1 className="text-lg font-semibold text-gray-900">Job unavailable</h1>
          <p className="mt-2 text-sm text-gray-600">{error ?? "This job could not be found."}</p>
        </div>
      </div>
    );
  }

  const salary = jobSalary(job);
  const experience =
    job.experienceMin != null || job.experienceMax != null
      ? `${job.experienceMin ?? 0}–${job.experienceMax ?? "∞"} years experience`
      : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <Link href="/user/jobs" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[#205ec5] hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      <section className={DASHBOARD_CARD_CLASS}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-gray-900">{job.title}</h1>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" />{job.company.name}</span>
              {(job.location || job.workMode) && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{[job.location, job.workMode].filter(Boolean).join(" · ")}</span>}
              {job.employmentType && <span className="inline-flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{job.employmentType}</span>}
            </div>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:items-end">
            {match && (
              <div
                className={`w-full rounded-lg border px-3 py-2 text-left sm:w-auto sm:min-w-36 sm:text-right ${match.badgeClassName}`}
                aria-label={`${match.label}: ${match.percent}% match`}
              >
                <p className="text-xs font-medium">AI Match</p>
                <p className="text-2xl font-bold leading-tight">
                  {match.percent}%
                </p>
                <p className="text-xs font-medium">{match.label}</p>
              </div>
            )}
            <GradientButton className="w-full sm:w-auto" loading={applying} disabled={job.hasApplied} onClick={() => void apply()}>
              {job.hasApplied ? <><Check className="h-4 w-4" />Applied{job.applicationStatus ? ` · ${job.applicationStatus}` : ""}</> : "Apply"}
            </GradientButton>
            {applyError && <p className="mt-2 text-xs font-medium text-red-700">{applyError}</p>}
          </div>
        </div>
      </section>

      <section className={DASHBOARD_CARD_CLASS}>
        <h2 className="text-lg font-semibold text-gray-900">Job overview</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {job.department && <Detail icon={<Briefcase className="h-4 w-4" />} label="Department" value={job.department} />}
          {experience && <Detail icon={<Clock3 className="h-4 w-4" />} label="Experience" value={experience} />}
          {salary && <Detail icon={<DollarSign className="h-4 w-4" />} label="Compensation" value={salary} />}
          {job.noticePeriod && <Detail icon={<Clock3 className="h-4 w-4" />} label="Notice period" value={job.noticePeriod} />}
          {job.industry && <Detail icon={<Building2 className="h-4 w-4" />} label="Industry" value={job.industry.name} />}
          {job.jobRole && <Detail icon={<Briefcase className="h-4 w-4" />} label="Role" value={job.jobRole.name} />}
        </div>
      </section>

      {job.skills.length > 0 && (
        <section className={DASHBOARD_CARD_CLASS}>
          <h2 className="text-lg font-semibold text-gray-900">Skills</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {job.skills.map((skill) => <span key={skill.id} className={`rounded-full px-3 py-1 text-sm ${skill.required ? "bg-blue-50 font-medium text-[#205ec5]" : "bg-gray-100 text-gray-700"}`}>{skill.name}{skill.required ? " · Required" : ""}</span>)}
          </div>
        </section>
      )}

      <JobTextSection title="About this role" content={job.description} featured />
      <JobTextSection title="Responsibilities" content={job.responsibilities} />
      <JobTextSection title="Requirements" content={job.requirements} />
      <JobTextSection title="Benefits" content={job.benefits} />
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5 text-sm"><span className="mt-0.5 text-gray-400">{icon}</span><div><p className="text-xs text-gray-500">{label}</p><p className="mt-0.5 font-medium text-gray-800">{value}</p></div></div>;
}

function JobTextSection({
  title,
  content,
  featured = false,
}: {
  title: string;
  content: string | null;
  featured?: boolean;
}) {
  const richText = useMemo(() => sanitizeJobRichText(content), [content]);
  const containsHtml = /<\/?[a-z][^>]*>/i.test(content ?? "");

  if (!richText) return null;

  return (
    <section className={DASHBOARD_CARD_CLASS}>
      <div className="max-w-3xl">
        <h2 className={featured ? "text-xl font-semibold text-gray-900" : "text-lg font-semibold text-gray-900"}>
          {title}
        </h2>
        {containsHtml ? (
          <div
            className="mt-4 text-[15px] leading-7 text-gray-700 [&_a]:font-medium [&_a]:text-[#205ec5] [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-blue-800 [&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-200 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h1]:mt-8 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h2]:mt-7 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-snug [&_h4]:mt-5 [&_h4]:font-semibold [&_h5]:mt-5 [&_h5]:font-semibold [&_h6]:mt-5 [&_h6]:font-semibold [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:my-4 [&_strong]:font-semibold [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: richText }}
          />
        ) : (
          <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-gray-700">{richText}</p>
        )}
      </div>
    </section>
  );
}
