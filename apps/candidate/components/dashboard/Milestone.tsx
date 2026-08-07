import { MILESTONE_CONFIG } from "@/constants/constants";
import { useI18n } from "@/contexts/I18nContext";
import type { MilestoneStatusItem } from "@/interfaces/types";
import { CircleLoader, CompletedCircleTick } from "../ui/CompletedCircleTick";

/** Normalize API milestone key to match MILESTONE_CONFIG (e.g. "Self-Awareness" → "self_awareness"). */
function normalizeMilestoneKey(key: string): string {
    return key
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_");
}

/** Normalize status from API: "completed" → CompletedCircleTick, "in_progress" / "in-progress" / "In Progress" → loader. */
function normalizeStatus(s: string): string {
    if (!s || typeof s !== "string") return "";
    return s
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_");
}

export function Milestone({
    isStarted = false,
    loadingIndex = -1,
    conversationStatus,
    isAssistantSpeaking = false,
}: {
    isStarted?: boolean;
    loadingIndex?: number;
    /** From milestone_tracker API: milestone_status.conversation_status */
    conversationStatus?: MilestoneStatusItem[];
    /** When true, show loader on the current/in-progress milestone while Numi is speaking (before API returns). */
    isAssistantSpeaking?: boolean;
} = {}) {
    const { t } = useI18n();

    // Build one status per milestone from API (multiple "completed" + one "in_progress" supported)
    const statusByKey = (() => {
        const map: Record<string, string> = {};
        if (Array.isArray(conversationStatus)) {
            conversationStatus.forEach((s) => {
                const key = normalizeMilestoneKey(s.milestone);
                map[key] = normalizeStatus(s.status);
            });
        }
        return map;
    })();

    const inProgressIndex = MILESTONE_CONFIG.findIndex(
        (item) => normalizeStatus(statusByKey[item.key] ?? "") === "in_progress"
    );
    const firstNotCompletedIndex = MILESTONE_CONFIG.findIndex(
        (item) => normalizeStatus(statusByKey[item.key] ?? "") !== "completed"
    );
    const speakingLoaderIndex =
        inProgressIndex >= 0 ? inProgressIndex : firstNotCompletedIndex >= 0 ? firstNotCompletedIndex : 0;

    return (
        <div className="w-full h-full min-h-50 rounded-xl border bg-[#0f172a]/40 border-white/10 backdrop-blur-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden">
            <h3 className="p-6 pl-6 shrink-0 text-base font-bold text-white/90">{t("aiQuestionnaire.milestone.progress")}</h3>
            <ul className="flex-1 overflow-y-auto scrollbar-hide p-4  min-h-0 flex flex-col gap-0 bg-slate-900/40 m-6 mt-0 rounded-xl">
                {MILESTONE_CONFIG.map((item, index) => {
                    const status = normalizeStatus(statusByKey[item.key] ?? "");
                    const isCompleted = status === "completed";
                    const isInProgress = status === "in_progress";
                    const showLoader =
                        isInProgress ||
                        (loadingIndex >= 0 && loadingIndex === index) ||
                        (isAssistantSpeaking && index === speakingLoaderIndex);
                    return (
                        <li key={item.key} className="flex items-start gap-4 shrink-0">
                            <div className="flex flex-col items-center shrink-0">
                                {isCompleted ? (
                                    <CompletedCircleTick
                                        size={40}
                                        strokeWidth={2}
                                        className="shrink-0"
                                    />
                                ) : showLoader ? (
                                    <CircleLoader size={40} strokeWidth={2} className="shrink-0" />
                                ) : (
                                    <div className="h-10 w-10 shrink-0 rounded-full border-slate-900/40 bg-slate-900/40" />
                                )}
                                {index < MILESTONE_CONFIG.length - 1 && (
                                    <div className="w-0.5 h-3 bg-slate-900/40 shrink-0" aria-hidden />
                                )}
                            </div>
                            <div className="h-7 flex-1 min-w-0 max-w-[80%] rounded mt-2 flex items-center">
                                {isStarted ? (
                                    <span
                                        className={`text-sm ${
                                            isCompleted
                                                ? "text-emerald-400/90"
                                                : showLoader
                                                  ? "text-amber-400/90"
                                                  : "text-white/90"
                                        }`}
                                    >
                                        {t(`aiQuestionnaire.milestone.labels.${item.key}`) || item.label}
                                    </span>
                                ) : (
                                    <div
                                        className="h-6 w-full max-w-[80%] rounded bg-white/10 animate-pulse"
                                        aria-hidden
                                    />
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
