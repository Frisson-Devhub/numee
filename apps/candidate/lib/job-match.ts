/** Candidate-facing match badge derived from a Qdrant cosine score. */
export type MatchPresentation = {
  percent: number;
  label: "Strong match" | "Good match" | "Potential match";
  badgeClassName: string;
};

/**
 * Qdrant's Cosine distance returns cosine similarity, whose mathematical range
 * is -1 through 1. Map that range to 0–100 for a candidate-facing percentage.
 */
export function getMatchPresentation(score: unknown): MatchPresentation | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;

  const percent = Math.round(Math.min(1, Math.max(0, (score + 1) / 2)) * 100);

  if (percent >= 75) {
    return {
      percent,
      label: "Strong match",
      badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (percent >= 60) {
    return {
      percent,
      label: "Good match",
      badgeClassName: "border-blue-200 bg-blue-50 text-[#205ec5]",
    };
  }
  return {
    percent,
    label: "Potential match",
    badgeClassName: "border-slate-200 bg-slate-50 text-slate-700",
  };
}
