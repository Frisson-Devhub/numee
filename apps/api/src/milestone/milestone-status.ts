import { INITIAL_MILESTONE_STATUS, MILESTONE_CONFIG } from "@numee/shared/server";
import type { StoredMilestoneDocument, StoredMilestoneItem } from "@numee/shared/server";

/** Default when milestone JSON omits `resume_allowed`. */
export const DEFAULT_RESUME_ALLOWED = true;

/** Fresh milestone document with default resume_allowed. */
export function createInitialMilestoneDocument(): StoredMilestoneDocument {
  return {
    milestones: INITIAL_MILESTONE_STATUS.map((m) => ({ ...m })),
    resume_allowed: DEFAULT_RESUME_ALLOWED,
  };
}

/** Normalize legacy array or object milestone JSON into StoredMilestoneDocument. */
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

/** Extract milestone items from any stored shape. */
export function getMilestonesFromStored(raw: unknown): StoredMilestoneItem[] {
  return parseStoredMilestoneStatus(raw).milestones;
}

/** Build a milestone document for persistence. */
export function wrapMilestoneStatus(
  milestones: StoredMilestoneItem[],
  resumeAllowed: boolean = DEFAULT_RESUME_ALLOWED,
  redFlag?: boolean,
): StoredMilestoneDocument {
  return {
    milestones,
    resume_allowed: resumeAllowed,
    ...(redFlag === true ? { red_flag: true } : {}),
  };
}

/** Copy stored milestones and override resume_allowed (preserves red_flag). */
export function withResumeAllowed(
  raw: unknown,
  resumeAllowed: boolean,
): StoredMilestoneDocument {
  const doc = parseStoredMilestoneStatus(raw);
  return {
    milestones: doc.milestones,
    resume_allowed: resumeAllowed,
    ...(doc.red_flag === true ? { red_flag: true } : {}),
  };
}

/** Project stored milestones onto MILESTONE_CONFIG order for the UI/agent. */
export function milestonesToUiFormat(
  milestones: StoredMilestoneItem[],
): Array<{ milestone: string; status: string }> {
  return MILESTONE_CONFIG.map((c) => {
    const item = milestones.find((m) => m.key === c.key);
    return { milestone: c.key, status: item?.status ?? "incomplete" };
  });
}
