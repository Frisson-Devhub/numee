"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase, Building2, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { apiRoutes } from "@/constants/api";
import { DASHBOARD_CARD_CLASS } from "@/constants/constants";
import { ApiCall } from "@/lib/utils";
import { getMatchPresentation } from "@/lib/job-match";
import { Spinner } from "@/components/ui/Spinner";
import { GradientButton } from "@/components/ui/GradientButton";

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

/**
 * Job browse + AI match: optional embedding then Qdrant match, with industry
 * filter browse when not matching.
 */
export default function JobsPage() {
  const [query, setQuery] = useState("");
  const [matching, setMatching] = useState(false);
  const [matchStage, setMatchStage] = useState<MatchStage>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matches, setMatches] = useState<JobMatch[] | null>(null);

  const [industries, setIndustries] = useState<IndustryOption[]>([]);
  const [industryId, setIndustryId] = useState("");
  const [browseLoading, setBrowseLoading] = useState(true);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [browseJobs, setBrowseJobs] = useState<BrowseJob[]>([]);

  const loadBrowse = useCallback(async (selectedIndustryId?: string) => {
    setBrowseLoading(true);
    setBrowseError(null);
    const params = new URLSearchParams({ limit: "20" });
    if (selectedIndustryId) params.set("industryId", selectedIndustryId);
    const res = await ApiCall<{
      jobs?: BrowseJob[];
      error?: string;
    }>({
      url: `${apiRoutes.user.jobs}?${params.toString()}`,
      method: "GET",
    });
    setBrowseLoading(false);
    if (!res.ok) {
      setBrowseError(
        res.data?.error ?? res.error ?? "Failed to load published jobs",
      );
      setBrowseJobs([]);
      return;
    }
    setBrowseJobs(res.data?.jobs ?? []);
  }, []);

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
      if (!cancelled) await loadBrowse("");
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
        matchErrorMessage(
          error instanceof Error ? error.message : undefined,
        ),
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
              We embed skills and roles from your assessment, match them to job
              embeddings, and show the closest open roles.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none ring-[#205ec5] placeholder:text-gray-400 focus:ring-2"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void findMatches();
              }}
              placeholder="Optional: e.g. backend engineer, fintech"
              disabled={matching}
            />
          </div>
          <GradientButton
            type="button"
            loading={matching}
            onClick={() => void findMatches()}
            className="sm:w-auto"
          >
            Find AI Match
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
                  : "Matching against job embeddings…"}
              </p>
              <p className="mt-0.5 text-xs text-blue-700">
                We&apos;ll return the closest open roles by vector similarity.
              </p>
            </div>
          </div>
        )}

        {matchError && (
          <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {matchError}
          </p>
        )}

        {!matching && matches && matches.length === 0 && !matchError && (
          <p className="mt-4 text-sm text-gray-500">
            No matching published jobs yet. Complete your assessment, add a
            resume, or try a different keyword.
          </p>
        )}

        {!matching && matches && matches.length > 0 && (
          <>
            <p className="mt-5 text-sm font-medium text-gray-700">
              Your top {matches.length} AI matches
            </p>
            <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-100">
              {matches.map((m) => {
                const match = getMatchPresentation(m.score);
                const href = match
                  ? `/user/jobs/${m.jobId}?match=${encodeURIComponent(String(m.score))}`
                  : `/user/jobs/${m.jobId}`;

                return (
                  <li key={m.jobId}>
                    <Link
                      href={href}
                      className="block px-4 py-3 transition-colors hover:bg-blue-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#205ec5]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{m.title}</p>
                          <JobMeta
                            companyName={m.companyName}
                            industryName={m.industryName}
                            jobRoleName={m.jobRoleName}
                            location={m.location}
                            workMode={m.workMode}
                          />
                          {m.snippet && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                              {m.snippet}
                            </p>
                          )}
                        </div>
                        {match ? (
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-right text-xs font-semibold ${match.badgeClassName}`}
                            aria-label={`${match.label}: ${match.percent}% match`}
                          >
                            <span className="block">Match {match.percent}%</span>
                            <span className="block text-[10px] font-medium">
                              {match.label}
                            </span>
                          </span>
                        ) : (
                          <span className="shrink-0 text-right text-xs font-medium text-gray-500">
                            Match unavailable
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section className={DASHBOARD_CARD_CLASS}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Browse published jobs
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Explore open roles, optionally filtered by industry.
            </p>
          </div>
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#205ec5]"
            value={industryId}
            onChange={(e) => {
              const next = e.target.value;
              setIndustryId(next);
              void loadBrowse(next);
            }}
          >
            <option value="">All industries</option>
            {industries.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.name}
              </option>
            ))}
          </select>
        </div>

        {browseLoading && (
          <div className="mt-6 flex justify-center py-8">
            <Spinner className="h-8 w-8 text-[#205ec5]" />
          </div>
        )}

        {browseError && (
          <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {browseError}
          </p>
        )}

        {!browseLoading && !browseError && browseJobs.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">
            No published jobs
            {industryId ? " in this industry" : ""} yet.
          </p>
        )}

        {!browseLoading && browseJobs.length > 0 && (
          <ul className="mt-5 divide-y divide-gray-100 rounded-lg border border-gray-100">
            {browseJobs.map((job) => (
              <li key={job.jobId}>
                <Link
                  href={`/user/jobs/${job.jobId}`}
                  className="block px-4 py-3 transition-colors hover:bg-blue-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#205ec5]"
                >
                  <p className="font-medium text-gray-900">{job.title}</p>
                  <JobMeta
                    companyName={job.companyName}
                    industryName={job.industryName}
                    jobRoleName={job.jobRoleName}
                    location={job.location}
                    workMode={job.workMode}
                  />
                  {job.snippet && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {job.snippet}
                    </p>
                  )}
                  <p className="mt-2 text-xs font-medium text-gray-500">
                    Run AI Match to see your fit
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
