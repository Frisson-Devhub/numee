import {
  DEFAULT_ASSESSMENT_ID,
  INITIAL_MILESTONE_STATUS,
  MILESTONE_CONFIG,
} from "../constants/constants";
import { frontendRoutes } from "../constants/frontendRoutes";
import type { StoredMilestoneDocument, StoredMilestoneItem } from "../types";

/** Default `resume_allowed` when creating or parsing milestone documents. */
export const DEFAULT_RESUME_ALLOWED = true;

/** Fresh milestone document with all milestones `incomplete` and resume allowed. */
export function createInitialMilestoneDocument(): StoredMilestoneDocument {
    return {
        milestones: INITIAL_MILESTONE_STATUS.map((m) => ({ ...m })),
        resume_allowed: DEFAULT_RESUME_ALLOWED,
    };
}

/** Parse DB JSON: wrapped object `{ milestones, resume_allowed }` or legacy array of items. */
export function parseStoredMilestoneStatus(raw: unknown): StoredMilestoneDocument {
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const o = raw as Record<string, unknown>;
        const milestonesRaw = o.milestones;
        const milestones = Array.isArray(milestonesRaw)
            ? milestonesRaw.filter(isStoredMilestoneItem)
            : [];
        return {
            milestones:
                milestones.length > 0
                    ? milestones
                    : INITIAL_MILESTONE_STATUS.map((m) => ({ ...m })),
            resume_allowed:
                typeof o.resume_allowed === "boolean"
                    ? o.resume_allowed
                    : DEFAULT_RESUME_ALLOWED,
            ...(o.red_flag === true ? { red_flag: true } : {}),
        };
    }
    if (Array.isArray(raw) && raw.length > 0) {
        return {
            milestones: raw.filter(isStoredMilestoneItem),
            resume_allowed: DEFAULT_RESUME_ALLOWED,
        };
    }
    return createInitialMilestoneDocument();
}

function isStoredMilestoneItem(x: unknown): x is StoredMilestoneItem {
    return (
        typeof x === "object" &&
        x !== null &&
        "key" in x &&
        "status" in x &&
        typeof (x as StoredMilestoneItem).key === "string" &&
        typeof (x as StoredMilestoneItem).status === "string"
    );
}

/** Milestone items from stored JSON (parses legacy array or wrapped document). */
export function getMilestonesFromStored(raw: unknown): StoredMilestoneItem[] {
    return parseStoredMilestoneStatus(raw).milestones;
}

/** Whether the user may resume the assessment from stored milestone JSON. */
export function getResumeAllowedFromStored(raw: unknown): boolean {
    return parseStoredMilestoneStatus(raw).resume_allowed;
}

/** Build a StoredMilestoneDocument from items + resume/red-flag flags. */
export function wrapMilestoneStatus(
    milestones: StoredMilestoneItem[],
    resumeAllowed: boolean = DEFAULT_RESUME_ALLOWED,
    redFlag?: boolean
): StoredMilestoneDocument {
    return {
        milestones,
        resume_allowed: resumeAllowed,
        ...(redFlag === true ? { red_flag: true } : {}),
    };
}

/** Parse stored JSON and return a copy with an updated `resume_allowed` flag. */
export function withResumeAllowed(
    raw: unknown,
    resumeAllowed: boolean
): StoredMilestoneDocument {
    const doc = parseStoredMilestoneStatus(raw);
    return {
        milestones: doc.milestones,
        resume_allowed: resumeAllowed,
        ...(doc.red_flag === true ? { red_flag: true } : {}),
    };
}

/** Normalize milestone keys from API (`milestone`) or DB (`key`). */
export function milestoneItemsToTrackerFormat(
    items: Array<{ key?: string; milestone?: string; status: string }>
): StoredMilestoneItem[] {
    return items
        .map((s) => ({
            key: (s.key ?? s.milestone ?? "").trim(),
            status: s.status,
        }))
        .filter((s) => s.key.length > 0);
}

/**
 * Expand stored items to full MILESTONE_CONFIG order for the tracker UI.
 * Missing keys default to `incomplete`.
 */
export function milestonesToUiFormat(
    milestones: StoredMilestoneItem[]
): Array<{ milestone: string; status: string }> {
    return MILESTONE_CONFIG.map((c) => {
        const item = milestones.find((m) => m.key === c.key);
        return { milestone: c.key, status: item?.status ?? "incomplete" };
    });
}

function normalizeMilestoneKeyForProgress(key: string): string {
    return key.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

function normalizeStatusForProgress(s: string): string {
    return String(s ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_");
}

/** Completed milestones / total from MILESTONE_CONFIG (0–100). */
export function getMilestoneCompletionPercent(
    conversationStatus: Array<{ milestone?: string; key?: string; status: string }> | null | undefined
): number {
    if (!MILESTONE_CONFIG.length) return 0;

    const statusByKey = new Map<string, string>();
    if (Array.isArray(conversationStatus)) {
        conversationStatus.forEach((s) => {
            const rawKey =
                (s as { milestone?: string }).milestone ?? (s as { key?: string }).key ?? "";
            const key = normalizeMilestoneKeyForProgress(rawKey);
            if (key) statusByKey.set(key, normalizeStatusForProgress(s.status));
        });
    }

    let completed = 0;
    MILESTONE_CONFIG.forEach((c) => {
        if (statusByKey.get(normalizeMilestoneKeyForProgress(c.key)) === "completed") {
            completed += 1;
        }
    });

    return Math.round((completed / MILESTONE_CONFIG.length) * 100);
}

/** True when every configured milestone is `completed`. */
export function allMilestonesCompleted(
  conversationStatus: Array<{ milestone?: string; key?: string; status: string }> | null | undefined,
): boolean {
  return getMilestoneCompletionPercent(conversationStatus) >= 100;
}

/** Questionnaire URL for a given assessment id (defaults to assessment1). */
export function questionnaireHrefForAssessment(assessmentId?: string): string {
  const id = assessmentId?.trim() || DEFAULT_ASSESSMENT_ID;
  return `${frontendRoutes.questionnaire}?assessmentId=${encodeURIComponent(id)}`;
}

/**
 * Apply is allowed when assessment1 has all milestones complete.
 * Only one assessment is offered for now, so the questionnaire href is always assessment1.
 */
export function resolveJobApplyAssessmentGate(
  assessments: Array<{ assessmentId: string; milestoneStatus?: unknown }>,
): { canApply: boolean; assessmentHref: string } {
  const primary = assessments.find(
    (row) => row.assessmentId === DEFAULT_ASSESSMENT_ID,
  );
  const canApply = allMilestonesCompleted(
    parseStoredMilestoneStatus(primary?.milestoneStatus).milestones,
  );
  return {
    canApply,
    assessmentHref: questionnaireHrefForAssessment(DEFAULT_ASSESSMENT_ID),
  };
}
