/** Candidate-facing match badge derived from LLM final_score or legacy cosine. */
export type MatchPresentation = {
  percent: number;
  label: "Excellent" | "Strong" | "Good" | "Moderate" | "Weak";
  badgeClassName: string;
};

/**
 * Optional LLM explain fields returned with AI job matches.
 * Layer scores are 0–100 when present.
 */
export type JobMatchExplainFields = {
  score?: number | null;
  matchLevel?: string;
  semanticScore?: number;
  assessmentScore?: number;
  preferenceScore?: number;
  matchingSkills?: string[];
  missingSkills?: string[];
  strengths?: string[];
  concerns?: string[];
  summary?: string;
  recommendation?: string;
};

const MATCH_EXPLAIN_STORAGE_KEY = "numee_candidate_job_match_explain";

type StashedMatchExplain = JobMatchExplainFields & { jobId: string };

/**
 * Normalize a match score to a 0–100 percentage and band label.
 * LLM `final_score` (and fail-soft mapped scores) arrive as 0–100 (`score > 1`);
 * legacy Qdrant cosine similarity (−1…1) is mapped with `(score + 1) / 2`.
 */
export function getMatchPresentation(score: unknown): MatchPresentation | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;

  const percent =
    score > 1
      ? Math.round(Math.min(100, Math.max(0, score)))
      : Math.round(Math.min(1, Math.max(0, (score + 1) / 2)) * 100);

  if (percent >= 90) {
    return {
      percent,
      label: "Excellent",
      badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (percent >= 75) {
    return {
      percent,
      label: "Strong",
      badgeClassName: "border-teal-200 bg-teal-50 text-teal-700",
    };
  }
  if (percent >= 60) {
    return {
      percent,
      label: "Good",
      badgeClassName: "border-blue-200 bg-blue-50 text-[#205ec5]",
    };
  }
  if (percent >= 40) {
    return {
      percent,
      label: "Moderate",
      badgeClassName: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }
  return {
    percent,
    label: "Weak",
    badgeClassName: "border-slate-200 bg-slate-50 text-slate-700",
  };
}

/** Trim and drop empty strings; optionally cap length for list previews. */
export function cleanMatchBullets(
  items?: string[] | null,
  limit?: number,
): string[] {
  const cleaned = (items ?? []).map((s) => s.trim()).filter(Boolean);
  return typeof limit === "number" ? cleaned.slice(0, limit) : cleaned;
}

/** True when any explain field is worth rendering on the detail page. */
export function hasMatchExplainContent(
  fields: JobMatchExplainFields | null | undefined,
): boolean {
  if (!fields) return false;
  return Boolean(
    fields.summary?.trim() ||
      fields.recommendation?.trim() ||
      cleanMatchBullets(fields.strengths).length > 0 ||
      cleanMatchBullets(fields.concerns).length > 0 ||
      cleanMatchBullets(fields.matchingSkills).length > 0 ||
      cleanMatchBullets(fields.missingSkills).length > 0 ||
      typeof fields.semanticScore === "number" ||
      typeof fields.assessmentScore === "number" ||
      typeof fields.preferenceScore === "number",
  );
}

/**
 * Stash match explain for the job detail page (same-tab navigation).
 * Detail reads via {@link readStashedJobMatchExplain}; score also stays in `?match=`.
 */
export function stashJobMatchExplain(
  jobId: string,
  fields: JobMatchExplainFields,
): void {
  if (typeof window === "undefined" || !jobId) return;
  try {
    const payload: StashedMatchExplain = { ...fields, jobId };
    window.sessionStorage.setItem(
      MATCH_EXPLAIN_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // sessionStorage may be unavailable; detail still shows score from query.
  }
}

/** Read stashed explain for `jobId`, or null if missing / mismatched. */
export function readStashedJobMatchExplain(
  jobId: string,
): JobMatchExplainFields | null {
  if (typeof window === "undefined" || !jobId) return null;
  try {
    const raw = window.sessionStorage.getItem(MATCH_EXPLAIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StashedMatchExplain;
    if (!parsed || parsed.jobId !== jobId) return null;
    const { jobId: _id, ...fields } = parsed;
    return fields;
  } catch {
    return null;
  }
}
