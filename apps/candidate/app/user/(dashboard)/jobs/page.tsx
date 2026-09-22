"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  FlaskConical,
  MapPin,
  Search,
} from "lucide-react";
import Link from "next/link";
import { apiRoutes } from "@/constants/api";
import { DASHBOARD_CARD_CLASS } from "@/constants/constants";
import { ApiCall } from "@/lib/utils";
import {
  getMatchPresentation,
  stashJobMatchExplain,
  type JobMatchExplainFields,
} from "@/lib/job-match";
import { Spinner } from "@/components/ui/Spinner";
import { GradientButton } from "@/components/ui/GradientButton";
import { JobMatchBadge } from "@/components/jobs/JobMatchBadge";
import { JobMatchCardPreview } from "@/components/jobs/JobMatchExplain";
import { JobStatusTag } from "@/components/jobs/JobStatusTag";

type JobMatch = {
  jobId: string;
  score?: number | null;
  title: string;
  companyId: string;
  companyName: string;
  industryId: string | null;
  industryName: string | null;
  jobRoleId: string | null;
  jobRoleName: string | null;
  location: string | null;
  workMode: string | null;
  snippet: string | null;
  status: string;
} & JobMatchExplainFields;

type FilterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  options: {
    value: string;
    label: string;
  }[];
};

type BrowseJob = Omit<JobMatch, "score">;

type IndustryOption = { id: string; name: string; slug: string };

type MatchStage = "embedding" | "matching" | null;

/** Map Nest/Qdrant match errors to candidate-safe copy (profile incomplete vs infra). */
function matchErrorMessage(error?: string | null): string {
  const message = error?.trim() || "";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("assessment") ||
    normalized.includes("resume") ||
    normalized.includes("profile") ||
    normalized.includes("skills or roles") ||
    normalized.includes("candidate vector")
  ) {
    return "We need more of your candidate profile to find matches. Complete your assessment or add a resume, then try again.";
  }
  if (
    normalized.includes("qdrant") ||
    normalized.includes("redis") ||
    normalized.includes("openai") ||
    normalized.includes("embedding") ||
    normalized.includes("timed out")
  ) {
    return "AI matching is temporarily unavailable. Please try again in a few minutes.";
  }
  return message || "We couldn't find AI matches right now. Please try again.";
}

function JobMeta({
  companyName,
  industryName,
  jobRoleName,
  location,
  workMode,
}: {
  companyName: string;
  industryName: string | null;
  jobRoleName: string | null;
  location: string | null;
  workMode: string | null;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
      <span className="inline-flex items-center gap-1">
        <Building2 className="h-3.5 w-3.5" />
        {companyName}
      </span>
      {industryName && <span>{industryName}</span>}
      {jobRoleName && <span>{jobRoleName}</span>}
      {(location || workMode) && (
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {[location, workMode].filter(Boolean).join(" · ")}
        </span>
      )}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-5 rounded-lg border border-dashed border-gray-200 px-5 py-8 text-center">
      <p className="font-medium text-gray-800">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  ariaLabel,
  options,
}: FilterSelectProps) {
  return (
    <select
      className="w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#205ec5] sm:w-40"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Job browse + AI match: optional embedding then Qdrant match, with industry
 * and status filters on browse (handled by the API).
 */
export default function JobsPage() {
  const [query, setQuery] = useState("");
  const [matching, setMatching] = useState(false);
  const [matchStage, setMatchStage] = useState<MatchStage>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matches, setMatches] = useState<JobMatch[] | null>(null);

  const [industries, setIndustries] = useState<IndustryOption[]>([]);
  const [industryId, setIndustryId] = useState("");
  const [status, setStatus] = useState("");
  const [browseLoading, setBrowseLoading] = useState(true);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [browseJobs, setBrowseJobs] = useState<BrowseJob[]>([]);

  const loadBrowse = useCallback(
    async (filters?: { industryId?: string; status?: string }) => {
      setBrowseLoading(true);
      setBrowseError(null);
      const params = new URLSearchParams({ limit: "20" });
      if (filters?.industryId) params.set("industryId", filters.industryId);
      if (filters?.status) params.set("status", filters.status);
      const res = await ApiCall<{
        jobs?: BrowseJob[];
        error?: string;
      }>({
        url: `${apiRoutes.user.jobs}?${params.toString()}`,
        method: "GET",
      });
      setBrowseLoading(false);
      if (!res.ok) {
        setBrowseError(res.data?.error ?? res.error ?? "Failed to load jobs");
        setBrowseJobs([]);
        return;
      }
      setBrowseJobs(res.data?.jobs ?? []);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const industriesRes = await ApiCall<{
        industries?: IndustryOption[];
      }>({
        url: apiRoutes.user.jobsIndustries,
        method: "GET",
      });
      if (!cancelled && industriesRes.ok) {
        setIndustries(industriesRes.data?.industries ?? []);
      }
      if (!cancelled) await loadBrowse();
    })().catch((e) => {
      if (!cancelled) {
        setBrowseError(e instanceof Error ? e.message : "Failed to load jobs");
        setBrowseLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadBrowse]);

  const findMatches = async () => {
    setMatching(true);
    setMatchStage("embedding");
    setMatchError(null);
    const progressTimer = window.setTimeout(() => {
      setMatchStage("matching");
    }, 300);

    try {
      const res = await ApiCall<{
        matches?: JobMatch[];
        error?: string;
      }>({
        url: apiRoutes.user.jobsMatch,
        method: "POST",
        body: {
          query: query.trim() || undefined,
          limit: 10,
        },
      });
      if (!res.ok) {
        setMatchError(matchErrorMessage(res.data?.error ?? res.error));
        setMatches([]);
        return;
      }

      setMatches(
        [...(res.data?.matches ?? [])]
          .sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity))
          .slice(0, 10),
      );
    } catch (error) {
      setMatchError(
        matchErrorMessage(error instanceof Error ? error.message : undefined),
      );
      setMatches([]);
    } finally {
      window.clearTimeout(progressTimer);
      setMatchStage(null);
      setMatching(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <section className={DASHBOARD_CARD_CLASS}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#205ec5]">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-gray-900">Jobs</h1>
            <p className="mt-1 text-sm text-gray-500">
              Find roles that fit your assessment and profile — ranked by AI
              match score with a short explanation for each result.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="h-11 w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none ring-[#205ec5] placeholder:text-gray-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void findMatches();
              }}
              placeholder="Optional: e.g. backend engineer, fintech"
              disabled={matching}
              aria-label="Optional keywords for AI job match"
            />
          </div>
          <GradientButton
            type="button"
            loading={matching}
            onClick={() => void findMatches()}
            className="h-11 shrink-0 px-5 py-0 text-sm sm:w-auto sm:min-w-48"
            aria-label={
              matching
                ? "Finding AI matches"
                : "Find AI matches for your profile — experimental feature"
            }
          >
            <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
            {matching ? "Finding matches…" : "AI Match · Experimental"}
          </GradientButton>
        </div>

        {matching && (
          <div
            className="mt-5 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-[#174a9c]"
            role="status"
            aria-live="polite"
          >
            <Spinner className="h-5 w-5 shrink-0 text-[#205ec5]" />
            <div>
              <p className="font-medium">
                {matchStage === "embedding"
                  ? "Creating your assessment embedding…"
                  : "Scoring your top matches…"}
              </p>
              <p className="mt-0.5 text-xs text-blue-700">
                This usually takes a few seconds.
              </p>
            </div>
          </div>
        )}

        {matchError && (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">{matchError}</p>
          </div>
        )}

        {!matching && matches && matches.length === 0 && !matchError && (
          <EmptyState
            title="No matches yet"
            description="Complete your assessment, add a resume, or try a different keyword."
          />
        )}

        {!matching && matches && matches.length > 0 && (
          <div className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Your top AI matches
              </h2>
              <p className="text-xs text-gray-500">
                {matches.length} role{matches.length === 1 ? "" : "s"}
              </p>
            </div>
            <ul className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-100">
              {matches.map((m) => {
                const match = getMatchPresentation(m.score);
                const href = match
                  ? `/user/jobs/${m.jobId}?match=${encodeURIComponent(String(m.score))}`
                  : `/user/jobs/${m.jobId}`;

                return (
                  <li key={m.jobId}>
                    <Link
                      href={href}
                      onClick={() => {
                        stashJobMatchExplain(m.jobId, {
                          score: m.score,
                          matchLevel: m.matchLevel,
                          semanticScore: m.semanticScore,
                          assessmentScore: m.assessmentScore,
                          preferenceScore: m.preferenceScore,
                          matchingSkills: m.matchingSkills,
                          missingSkills: m.missingSkills,
                          strengths: m.strengths,
                          concerns: m.concerns,
                          summary: m.summary,
                          recommendation: m.recommendation,
                        });
                      }}
                      className="block px-4 py-4 transition-colors hover:bg-blue-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#205ec5]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900">
                            {m.title}
                          </p>
                          <JobMeta
                            companyName={m.companyName}
                            industryName={m.industryName}
                            jobRoleName={m.jobRoleName}
                            location={m.location}
                            workMode={m.workMode}
                          />
                          <JobMatchCardPreview
                            summary={m.summary}
                            snippet={m.snippet}
                            strengths={m.strengths}
                          />
                        </div>
                        {match ? (
                          <JobMatchBadge match={match} />
                        ) : (
                          <span className="shrink-0 pt-1 text-right text-xs font-medium text-gray-500">
                            Match unavailable
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className={DASHBOARD_CARD_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Browse jobs</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Explore open and closed roles, optionally filtered by status or
              industry.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <FilterSelect
              value={status}
              onChange={(next) => {
                setStatus(next);
                void loadBrowse({ industryId, status: next });
              }}
              ariaLabel="Filter jobs by status"
              options={[
                { value: "", label: "All statuses" },
                { value: "PUBLISHED", label: "Active" },
                { value: "CLOSED", label: "Closed" },
              ]}
            />

            <FilterSelect
              value={industryId}
              onChange={(next) => {
                setIndustryId(next);
                void loadBrowse({ industryId: next, status });
              }}
              ariaLabel="Filter jobs by industry"
              options={[
                { value: "", label: "All industries" },
                ...industries.map((ind) => ({
                  value: ind.id,
                  label: ind.name,
                })),
              ]}
            />
          </div>
        </div>

        {browseLoading && (
          <div className="mt-6 flex justify-center py-8">
            <Spinner className="h-8 w-8 text-[#205ec5]" />
          </div>
        )}

        {browseError && (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">{browseError}</p>
          </div>
        )}

        {!browseLoading && !browseError && browseJobs.length === 0 && (
          <EmptyState
            title="No jobs yet"
            description={
              industryId || status
                ? "Try another status or industry, or clear the filters."
                : "Check back soon for new open roles."
            }
          />
        )}

        {!browseLoading && browseJobs.length > 0 && (
          <ul className="mt-5 divide-y divide-gray-100 rounded-lg border border-gray-100">
            {browseJobs.map((job) => (
              <li key={job.jobId}>
                <Link
                  href={`/user/jobs/${job.jobId}`}
                  className="block px-4 py-4 transition-colors hover:bg-blue-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#205ec5]"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">{job.title}</p>

                      <JobMeta
                        companyName={job.companyName}
                        industryName={job.industryName}
                        jobRoleName={job.jobRoleName}
                        location={job.location}
                        workMode={job.workMode}
                      />
                    </div>

                    <div className="shrink-0 self-start">
                      <JobStatusTag
                        status={job.status}
                        className="uppercase tracking-wide"
                      />
                    </div>
                  </div>

                  {job.snippet && (
                    <p className="mt-2.5 text-sm leading-5 text-gray-600 line-clamp-2">
                      {job.snippet}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    {job.status === "CLOSED"
                      ? "This role is no longer accepting applications"
                      : "Run AI Match above to see your fit for this role"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
