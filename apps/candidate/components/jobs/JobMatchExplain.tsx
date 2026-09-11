import {
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  cleanMatchBullets,
  hasMatchExplainContent,
  type JobMatchExplainFields,
  type MatchPresentation,
} from "@/lib/job-match";
import { DASHBOARD_CARD_CLASS } from "@/constants/constants";

type JobMatchExplainProps = {
  fields: JobMatchExplainFields;
  match?: MatchPresentation | null;
};

function LayerBar({ label, score }: { label: string; score: number }) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="tabular-nums text-gray-500">{clamped}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[#205ec5]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function BulletList({
  items,
  tone,
}: {
  items: string[];
  tone: "positive" | "caution";
}) {
  const Icon = tone === "positive" ? CheckCircle2 : AlertCircle;
  const iconClass =
    tone === "positive" ? "text-emerald-600" : "text-amber-600";

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm text-gray-700">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} />
          <span className="leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Detail-page “why you match” card: summary, strengths/concerns,
 * optional layer breakdown, skills, and recommendation.
 */
export function JobMatchExplain({ fields, match }: JobMatchExplainProps) {
  if (!hasMatchExplainContent(fields)) return null;

  const summary = fields.summary?.trim() || "";
  const recommendation = fields.recommendation?.trim() || "";
  const strengths = cleanMatchBullets(fields.strengths, 5);
  const concerns = cleanMatchBullets(fields.concerns, 5);
  const matchingSkills = cleanMatchBullets(fields.matchingSkills, 8);
  const missingSkills = cleanMatchBullets(fields.missingSkills, 8);

  const layers = [
    { label: "Profile & skills fit", score: fields.semanticScore },
    { label: "Assessment fit", score: fields.assessmentScore },
    { label: "Preferences fit", score: fields.preferenceScore },
  ].filter(
    (layer): layer is { label: string; score: number } =>
      typeof layer.score === "number" && Number.isFinite(layer.score),
  );

  const title =
    fields.matchLevel?.trim() ||
    (match ? `${match.label} match` : "Your AI match");

  return (
    <section className={DASHBOARD_CARD_CLASS}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#205ec5]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            How this role fits your profile
            {match ? ` · ${match.percent}% overall` : ""}
          </p>
        </div>
      </div>

      {summary ? (
        <p className="mt-4 text-[15px] leading-7 text-gray-700">{summary}</p>
      ) : null}

      {(strengths.length > 0 || concerns.length > 0) && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {strengths.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Strengths
              </h3>
              <div className="mt-2.5">
                <BulletList items={strengths} tone="positive" />
              </div>
            </div>
          )}
          {concerns.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Things to consider
              </h3>
              <div className="mt-2.5">
                <BulletList items={concerns} tone="caution" />
              </div>
            </div>
          )}
        </div>
      )}

      {layers.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Fit breakdown
          </h3>
          <div className="mt-3 space-y-3">
            {layers.map((layer) => (
              <LayerBar
                key={layer.label}
                label={layer.label}
                score={layer.score}
              />
            ))}
          </div>
        </div>
      )}

      {(matchingSkills.length > 0 || missingSkills.length > 0) && (
        <div className="mt-5 border-t border-gray-100 pt-5 text-sm text-gray-700">
          {matchingSkills.length > 0 && (
            <p>
              <span className="font-medium text-gray-900">Matching skills: </span>
              {matchingSkills.join(" · ")}
            </p>
          )}
          {missingSkills.length > 0 && (
            <p className={matchingSkills.length > 0 ? "mt-2" : undefined}>
              <span className="font-medium text-gray-900">Gaps to watch: </span>
              {missingSkills.join(" · ")}
            </p>
          )}
        </div>
      )}

      {recommendation ? (
        <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#174a9c]">
            Recommendation
          </p>
          <p className="mt-1 text-sm leading-6 text-gray-800">
            {recommendation}
          </p>
        </div>
      ) : null}
    </section>
  );
}

type JobMatchCardPreviewProps = {
  summary?: string | null;
  snippet?: string | null;
  strengths?: string[] | null;
};

/**
 * Compact summary + up to two strengths for AI match list rows.
 */
export function JobMatchCardPreview({
  summary,
  snippet,
  strengths,
}: JobMatchCardPreviewProps) {
  const text = summary?.trim() || snippet?.trim() || "";
  const topStrengths = cleanMatchBullets(strengths, 2);

  if (!text && topStrengths.length === 0) return null;

  return (
    <div className="mt-2.5 space-y-1.5">
      {text ? (
        <p className="text-sm leading-5 text-gray-600 line-clamp-2">{text}</p>
      ) : null}
      {topStrengths.length > 0 && (
        <ul className="space-y-1">
          {topStrengths.map((item) => (
            <li
              key={item}
              className="flex gap-1.5 text-xs text-gray-600 line-clamp-1"
            >
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
