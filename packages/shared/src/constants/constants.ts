import type { DashboardData, DashboardDerivedData } from "../types";
import { formatLevel } from "../lib/format";

/**
 * Extract the dashboard payload from a stored entry. Handles both shapes:
 * - entry.data = payload (single nest)
 * - entry.data = { data: payload, status, message, success } (agent response double-nested)
 */
export function getDashboardPayloadFromEntry(entry: unknown): DashboardData | null {
  if (!entry || typeof entry !== "object") return null;
  const o = entry as Record<string, unknown>;
  const d = o.data;
  if (!d || typeof d !== "object") return null;
  const inner = (d as Record<string, unknown>).data;
  if (inner && typeof inner === "object" && inner !== null && ("jobs_report" in inner || "user_report" in inner)) {
    return inner as DashboardData;
  }
  return d as DashboardData;
}

/** Signup / verify OTP countdown length in seconds. */
export const OTP_EXPIRY_SECONDS = 3 * 60; // 3 min
/** Password-reset OTP TTL in milliseconds. */
export const RESET_OTP_EXPIRY_MS = 3 * 60 * 1000;
/** Max OTP resend attempts before the client blocks further requests. */
export const MAX_RESEND_ATTEMPTS = 3;
/** Static avatar asset used on the AI questionnaire UI. */
export const AVATAR_IMAGE_SRC = "/avatar-ai-questionnaire.png";

/** Display labels for questionnaire milestones (order matches MILESTONE_CONFIG). */
export const MILESTONE_ITEMS = [
  "About You",
  "Way of Working",
  "Self Awareness",
  "Working With Others",
  "New Situations",
  "Motivation",
  "Mindset",
  "Hobbies",
  "Preferences",
  "Education",
  "Feedback",
];

/** Canonical milestone keys + UI labels; used for progress % and storage shape. */
export const MILESTONE_CONFIG: { key: string; label: string }[] = [
  { key: "onboarding", label: "About You" },
  { key: "way_of_working", label: "Way of Working" },
  { key: "self_awareness", label: "Self Awareness" },
  { key: "working_with_others", label: "Working With Others" },
  { key: "new_situations", label: "New Situations" },
  { key: "motivation", label: "Motivation" },
  { key: "mindset", label: "Mindset" },
  { key: "hobbies", label: "Hobbies" },
  { key: "preferences", label: "Preferences" },
  { key: "education", label: "Education" },
  { key: "feedback", label: "Feedback" },
];

/** Default per-milestone status list (`incomplete`) for a new assessment. */
export const INITIAL_MILESTONE_STATUS: { key: string; status: string }[] = MILESTONE_CONFIG.map(
  (c) => ({ key: c.key, status: "incomplete" })
);

/** Default StoredMilestoneDocument when no progress exists yet. */
export const INITIAL_MILESTONE_DOCUMENT = {
  milestones: INITIAL_MILESTONE_STATUS,
  resume_allowed: true,
} as const;

/** Page size for admin user-management lists. */
export const ADMIN_USERS_PER_PAGE = 5;

/** Fallback professional summary when the agent report omits one. */
export const DEFAULT_PERSONAL_SUMMARY =
  "You are a motivated and self-driven individual with a strong inclination toward continuous learning and personal development. Your strengths in self-improvement and motivation, combined with your learning aptitude, position you well for roles that value growth and education.";

/** Fallback career cards when no recommended roles are present. */
export const DEFAULT_CAREER_RECOMMENDATIONS = [
  { title: "Learning and Development Specialist", description: "Your expertise in Continuous Self-Improvement and Learning Aptitude aligns well with the motivation for development and purpose, making this role ideal for your skill set." },
  { title: "Educational Consultant", description: "With a profound understanding of learning and strong motivation factors such as development and purpose, you fit well in a role that requires guidance and educational improvements." },
  { title: "Training Coordinato", description: "Your high motivation for development and your aptitude for learning make you suitable for coordinating and executing training programs." },
];

/** Tailwind background classes for motivation bar segments (rank order). */
export const MOTIVATION_BLOCK_COLORS = ["bg-[#FF718B]", "bg-[#FAAD14]", "bg-[#2FA78F]"];
/** Strength-score emoji faces by rank (low → high). */
export const EMOJI_BY_RANK = ["😢", "😐", "😊"];
/** Tailwind bg classes paired with EMOJI_BY_RANK. */
export const EMOJI_BG_BY_RANK = ["bg-[#FFA3B0]", "bg-[#FAAD14]", "bg-[#2FA78F]"];
/** Hex face colors paired with EMOJI_BY_RANK. */
export const EMOJI_FACE_COLOR_BY_RANK = ["#f9a8d4", "#fcd34d", "#5eead4"];

/** Placeholder strength-score rows when user_report motivations are missing. */
export const DEFAULT_STRENGTH_SCORE = [
  { label: "Development", value: 15, emoji: "😢", emojiBg: "bg-red-100", emojiFaceColor: EMOJI_FACE_COLOR_BY_RANK[0] },
  { label: "Challenges", value: 25, emoji: "😐", emojiBg: "bg-amber-100", emojiFaceColor: EMOJI_FACE_COLOR_BY_RANK[1] },
  { label: "Purposes", value: 60, emoji: "😊", emojiBg: "bg-green-100", emojiFaceColor: EMOJI_FACE_COLOR_BY_RANK[2] },
];

/** Shared Tailwind classes for candidate dashboard white cards. */
export const DASHBOARD_CARD_CLASS =
  "bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100";

/** First assessment id assigned to a new user. */
export const DEFAULT_ASSESSMENT_ID = "assessment1";
/** Hard cap on assessments a candidate may create. */
export const MAX_ASSESSMENTS_PER_USER = 4;

/** True when id matches `assessment` + digits (e.g. assessment1). */
export function isValidAssessmentId(id: string): boolean {
  return /^assessment\d+$/.test(String(id).trim());
}

/** True when id is valid and its number is within 1..MAX_ASSESSMENTS_PER_USER. */
export function isAssessmentIdWithinLimit(id: string): boolean {
  if (!isValidAssessmentId(id)) return false;
  const n = parseInt(id.replace(/^assessment/, ""), 10);
  return !Number.isNaN(n) && n >= 1 && n <= MAX_ASSESSMENTS_PER_USER;
}

/** Build select options `{ value, label }` from stored assessment ids. */
export function getAssessmentOptionsFromIds(assessmentIds: string[]): { value: string; label: string }[] {
  return assessmentIds.map((id) => {
    const n = id.replace(/^assessment/, "") || "1";
    return { value: id, label: `Assessment ${n}` };
  });
}

/** Next free assessment id, or null if the user is already at the max. */
export function getNextAssessmentId(assessmentIds: string[]): string | null {
  if (assessmentIds.length >= MAX_ASSESSMENTS_PER_USER) return null;
  if (assessmentIds.length === 0) return DEFAULT_ASSESSMENT_ID;
  const nums = assessmentIds
    .map((id) => parseInt(id.replace(/^assessment/, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  const next = max + 1;
  return next <= MAX_ASSESSMENTS_PER_USER ? `assessment${next}` : null;
}

/** Placeholder motivation bar segments when report data is missing. */
export const DEFAULT_MOTIVATION_BLOCKS = [
  { color: MOTIVATION_BLOCK_COLORS[0], width: 20 },
  { color: MOTIVATION_BLOCK_COLORS[1], width: 30 },
  { color: MOTIVATION_BLOCK_COLORS[2], width: 50 },
];

function buildOccurrenceLineData(values: number[]): Array<{ name: string; value: number }> {
  if (!values.length) return [{ name: "1", value: 1 }, { name: "2", value: 2 }, { name: "3", value: 3 }, { name: "4", value: 2.2 }, { name: "5", value: 1.5 }];
  const max = Math.max(...values);
  return values.map((v, i) => ({ name: String(i + 1), value: max ? (v / max) * 3 + 0.5 : 1 }));
}

/**
 * Map raw DashboardData into chart/card view-models for the candidate dashboard.
 * Falls back to DEFAULT_* placeholders when report fields are absent.
 */
export function getDashboardDerivedData(payload: DashboardData | null): DashboardDerivedData {
  const ur = payload?.user_report ?? null;
  const jr = payload?.jobs_report;
  const mainMot = payload?.main_motivations ?? [];

  const competencyReportSkills =
    ur?.main_competencies?.length && ur.competency_ui_score && ur.competency_level
      ? ur.main_competencies.slice(0, 3).map((name: string, i: number) => ({
          name,
          level: formatLevel(ur.competency_level?.[i] ?? "Level 1"),
          percentage: Math.min(100, Math.round(((ur.competency_ui_score?.[i] ?? 0) / 25) * 100)),
        }))
      : null;

  const scoreDistributionItems =
    ur?.main_competencies?.length && ur.competency_ui_score?.length
      ? (() => {
          const scores = ur.competency_ui_score!.slice(0, 3);
          const sum = scores.reduce((a: number, b: number) => a + b, 0);
          return ur.main_competencies!.slice(0, 3).map((name: string, i: number) => ({
            name,
            value: sum ? Math.round(((scores[i] ?? 0) / sum) * 100) : 0,
          }));
        })()
      : null;

  const competencyOccurrenceTimes = ur?.competency_distribution?.length
    ? Math.max(...ur.competency_distribution)
    : 3;
  const competencyOccurrenceLineData =
    ur?.competency_distribution?.length
      ? buildOccurrenceLineData(ur.competency_distribution)
      : undefined;
  const competencyOccurrencePills =
    ur?.main_competencies?.length
      ? ur.main_competencies.slice(0, 3).map((label: string, i: number) => ({
          label,
          active: ur.competency_distribution?.[i] === competencyOccurrenceTimes,
          times: ur?.competency_distribution?.[i] ?? competencyOccurrenceTimes,
        }))
      : undefined;

  const motivationOccurrenceTimes = ur?.motivation_distribution?.length
    ? Math.max(...ur.motivation_distribution)
    : 3;
  const motivationOccurrenceLineData =
    ur?.motivation_distribution?.length
      ? buildOccurrenceLineData(ur.motivation_distribution)
      : undefined;
  const motivationOccurrencePills =
    ur?.main_motivations?.length
      ? ur.main_motivations.slice(0, 3).map((label: string, i: number) => ({
          label,
          active: ur.motivation_distribution?.[i] === motivationOccurrenceTimes,
          times: ur?.motivation_distribution?.[i] ?? motivationOccurrenceTimes,
        }))
      : undefined;

  const recommendedJobs = jr?.recommended_roles ?? ur?.recommended_jobs ?? [];

  const personalSummary =
    (jr?.professional_summary ?? ur?.professional_summary)?.trim() || DEFAULT_PERSONAL_SUMMARY;
  const careerRecommendations =
    recommendedJobs.length > 0
      ? recommendedJobs.slice(0, 3).map((r: { job_role: string; reason?: string }) => ({ title: r.job_role, description: r.reason ?? "" }))
      : null;

  const strengthScore =
    ur?.main_motivations?.length && ur.motivation_ui_score
      ? ur.main_motivations.slice(0, 3).map((label: string, i: number) => {
          const value = ur.motivation_ui_score?.[i] ?? 0;
          const rank = i;
          return {
            label,
            value,
            emoji: EMOJI_BY_RANK[rank] ?? "😐",
            emojiBg: EMOJI_BG_BY_RANK[rank] ?? "bg-gray-100",
            emojiFaceColor: EMOJI_FACE_COLOR_BY_RANK[rank] ?? "#d1d5db",
          };
        })
      : DEFAULT_STRENGTH_SCORE;

  const motivationBlocks =
    mainMot.length > 0 && ur?.motivation_ui_score
      ? mainMot.slice(0, 3).map((_m: unknown, i: number) => ({
          color: MOTIVATION_BLOCK_COLORS[i % MOTIVATION_BLOCK_COLORS.length],
          width: ur.motivation_ui_score?.[i] ?? 33,
        }))
      : DEFAULT_MOTIVATION_BLOCKS;

  return {
    competencyReportSkills,
    scoreDistributionItems,
    competencyOccurrenceTimes,
    competencyOccurrenceLineData,
    competencyOccurrencePills,
    motivationOccurrenceTimes,
    motivationOccurrenceLineData,
    motivationOccurrencePills,
    recommendedJobs,
    personalSummary,
    careerRecommendations,
    strengthScore,
    motivationBlocks,
  };
}
