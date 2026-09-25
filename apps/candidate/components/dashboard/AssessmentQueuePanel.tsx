"use client";

import type { AssessmentSlotStatus } from "@/interfaces/types";
import { useI18n } from "@/contexts/I18nContext";

/**
 * Shown in place of the assistant while the candidate waits for a slot.
 *
 * Deliberately explicit about the three things a waiting person needs to know: that the
 * assessment is full, where they stand, and that they do not have to do anything.
 */
export function AssessmentQueuePanel({ slot }: { slot: AssessmentSlotStatus }) {
    const { t } = useI18n();
    const position = slot.position ?? slot.waiting;
    const ahead = Math.max(position - 1, 0);
    const isNext = ahead === 0;

    return (
        <div
            role="status"
            aria-live="polite"
            className="flex h-full w-full items-center justify-center p-4"
        >
            <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div
                    className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500"
                    aria-hidden="true"
                />

                <p className="text-sm text-gray-500">
                    {t("aiQuestionnaire.assistant.queue.queueWaiting")}
                </p>

                {isNext ? (
                    <p className="mt-4 text-xl font-semibold text-gray-900">
                        {t("aiQuestionnaire.assistant.queue.queueNext")}
                    </p>
                ) : (
                    <>
                        <p className="mt-4 text-3xl font-semibold text-gray-900 tabular-nums">
                            {t("aiQuestionnaire.assistant.queue.queuePosition", { position })}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                            {ahead === 1
                                ? t("aiQuestionnaire.assistant.queue.queueOnePerson")
                                : t("aiQuestionnaire.assistant.queue.queueManyPeople", {
                                      count: ahead,
                                  })}
                        </p>
                    </>
                )}

                <p className="mt-6 text-sm text-gray-500">
                    {t("aiQuestionnaire.assistant.queue.queueHint")}
                </p>
            </div>
        </div>
    );
}
