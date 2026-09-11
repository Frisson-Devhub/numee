import type { MatchPresentation } from "@/lib/job-match";

type JobMatchBadgeProps = {
  match: MatchPresentation;
  /** Compact for list rows; prominent for job detail header. */
  size?: "compact" | "prominent";
  className?: string;
};

/**
 * Score + band label badge for AI job matches.
 * Colors come from {@link getMatchPresentation}.
 */
export function JobMatchBadge({
  match,
  size = "compact",
  className = "",
}: JobMatchBadgeProps) {
  const aria = `${match.label}: ${match.percent}% match`;

  if (size === "prominent") {
    return (
      <div
        className={`w-full rounded-lg border px-3 py-2.5 text-left sm:w-auto sm:min-w-36 sm:text-right ${match.badgeClassName} ${className}`}
        aria-label={aria}
      >
        <p className="text-xs font-medium opacity-80">AI Match</p>
        <p className="text-2xl font-bold leading-tight">{match.percent}%</p>
        <p className="text-xs font-semibold">{match.label}</p>
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-center ${match.badgeClassName} ${className}`}
      aria-label={aria}
    >
      <p className="text-base font-bold leading-none tabular-nums">
        {match.percent}%
      </p>
      <p className="mt-0.5 text-[10px] font-semibold leading-tight">
        {match.label}
      </p>
    </div>
  );
}
