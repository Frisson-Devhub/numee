"use client";

import { useState } from "react";
import Link from "next/link";
import { frontendRoutes } from "@/constants/frontendRoutes";
import { Modal } from "@/components/ui/Modal";
import { MAX_ASSESSMENTS_PER_USER } from "@/constants/constants";
import type { AssessmentProgressBarProps } from "@/interfaces/types";
import { useI18n } from "@/contexts/I18nContext";

/**
 * Dashboard continue / start-new assessment CTA. Hides the bar for a brand-new
 * first assessment (0%) and gates new runs with the per-user limit modal.
 */
export function AssessmentProgressBar({
    percentage = 0,
    disableContinueButton = false,
    continueDisabledLabel = "Assessment Complete",
    assessmentId,
    startNewAssessmentHref,
    canStartNewAssessment = true,
    maxAssessmentsReached = false,
    isFirstAssessment = false,
}: AssessmentProgressBarProps) {
    const { t } = useI18n();
    const [showMilestonePopup, setShowMilestonePopup] = useState(false);
    const [showLimitReachedPopup, setShowLimitReachedPopup] = useState(false);
    const value = Math.min(100, Math.max(0, Number(percentage) || 0));
    const displayPercent = Math.round(value);
    const continueHref = assessmentId
        ? `${frontendRoutes.questionnaire}?assessmentId=${encodeURIComponent(assessmentId)}`
        : frontendRoutes.questionnaire;

    const hideProgressBar = isFirstAssessment && value === 0;

    return (
        <>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-center w-full">
                {!hideProgressBar ? (
                    <div className="flex-1 min-w-0 w-full flex flex-col gap-2 sm:gap-1">
                        <span className="text-xs font-medium text-gray-600 sm:sr-only" aria-hidden="true">
                            {t("assessmentProgressBar.progress")}
                        </span>
                        <div
                            className="relative w-full min-h-11 sm:min-h-10 h-12 sm:h-10 rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-200 shadow-inner"
                            role="progressbar"
                            aria-valuenow={displayPercent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={t("assessmentProgressBar.ariaLabel")}
                        >
                            {/* Track (unfilled) - visible gray */}
                            <div
                                className="absolute inset-0 rounded-lg bg-gray-200"
                                aria-hidden
                            />
                            {/* Filled - left portion */}
                            <div
                                className="absolute inset-y-0 left-0 rounded-l-lg transition-[width] duration-500 ease-out"
                                style={{ width: `${value}%` }}
                            >
                                <div
                                    className="absolute inset-0 rounded-l-lg bg-linear-to-r from-[#2D6CD5] via-[#2D6CD5] to-[#F17E26] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
                                    aria-hidden
                                />
                            </div>
                            {/* Percentage text: left when fill < 50% (on color), else centered */}
                            <div className="absolute inset-0 flex items-center pointer-events-none">
                                {value > 0 && value < 50 ? (
                                    <span className="text-base sm:text-sm font-bold tabular-nums drop-shadow-md text-white pl-3">
                                        {displayPercent}%
                                    </span>
                                ) : (
                                    <span
                                        className={`text-base sm:text-sm font-bold tabular-nums drop-shadow-md flex-1 text-center ${value >= 50 ? "text-white" : "text-gray-800"}`}
                                    >
                                        {displayPercent}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 min-w-0" aria-hidden />
                )}
                <div className="flex flex-nowrap items-center gap-1.5 sm:gap-3 min-w-0 overflow-x-auto">
                    {disableContinueButton ? (
                        <span
                            className="flex items-center gap-1.5 sm:gap-2 px-3 py-3 sm:px-4 sm:py-2 rounded-md sm:rounded-lg bg-gray-300 text-gray-500 font-semibold text-xs sm:text-sm cursor-not-allowed opacity-70 shrink-0 whitespace-nowrap"
                            aria-disabled="true"
                        >
                            {continueDisabledLabel}
                        </span>
                    ) : (
                        <Link
                            href={continueHref}
                            className="flex items-center gap-2 sm:gap-2 px-3 py-3 sm:px-4 sm:py-2 rounded-md sm:rounded-lg bg-linear-to-r from-[#2D6CD5] to-[#F17E26] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-[inset_0_1px_0_rgba(0,0,0,0.1)] hover:opacity-95 transition-opacity shrink-0 whitespace-nowrap"
                        >
                            {value === 0 ? t("dashboard.startAssessment") : t("assessmentProgressBar.continueAssessment")}
                        </Link>
                    )}
                    {(startNewAssessmentHref || maxAssessmentsReached) && !hideProgressBar &&
                        (maxAssessmentsReached ? (
                            <button
                                type="button"
                                onClick={() => setShowLimitReachedPopup(true)}
                                className="flex items-center gap-2 sm:gap-2 px-3 py-3 sm:px-4 sm:py-2 rounded-md sm:rounded-lg bg-linear-to-r from-[#2D6CD5] to-[#F17E26] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-[inset_0_1px_0_rgba(0,0,0,0.1)] hover:opacity-95 transition-opacity cursor-pointer shrink-0 whitespace-nowrap"
                            >
                                {t("assessmentProgressBar.startNewAssessment")}
                            </button>
                        ) : canStartNewAssessment ? (
                            <Link
                                href={startNewAssessmentHref!}
                                className="flex items-center gap-1.5 sm:gap-2 px-3 py-3 sm:px-4 sm:py-2 rounded-md sm:rounded-lg bg-linear-to-r from-[#2D6CD5] to-[#F17E26] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-[inset_0_1px_0_rgba(0,0,0,0.1)] hover:opacity-95 transition-opacity shrink-0 whitespace-nowrap"
                            >
                                {t("assessmentProgressBar.startNewAssessment")}
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowMilestonePopup(true)}
                                className="flex items-center gap-1.5 sm:gap-2 px-3 py-3 sm:px-4 sm:py-2 rounded-md sm:rounded-lg bg-linear-to-r from-[#2D6CD5] to-[#F17E26] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-[inset_0_1px_0_rgba(0,0,0,0.1)] hover:opacity-95 transition-opacity cursor-pointer shrink-0 whitespace-nowrap"
                            >
                                {t("assessmentProgressBar.startNewAssessment")}
                            </button>
                        ))}
                </div>
            </div>
            <Modal open={showMilestonePopup} onClose={() => setShowMilestonePopup(false)} className="max-w-md">
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {isFirstAssessment
                            ? t("assessmentProgressBar.milestoneTitleFirst")
                            : t("assessmentProgressBar.milestoneTitle")}
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                        {isFirstAssessment
                            ? t("assessmentProgressBar.milestoneBodyFirst")
                            : t("assessmentProgressBar.milestoneBody")}
                    </p>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setShowMilestonePopup(false)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-[#2D6CD5] to-[#F17E26] text-white font-semibold text-sm tracking-wide shadow-[inset_0_1px_0_rgba(0,0,0,0.1)] hover:opacity-95 transition-opacity cursor-pointer"
                        >
                            {t("assessmentProgressBar.ok")}
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal open={showLimitReachedPopup} onClose={() => setShowLimitReachedPopup(false)} className="max-w-md">
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {t("assessmentProgressBar.limitTitle")}
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                        {t("assessmentProgressBar.limitBody", { max: MAX_ASSESSMENTS_PER_USER })}
                    </p>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setShowLimitReachedPopup(false)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-[#2D6CD5] to-[#F17E26] text-white font-semibold text-sm tracking-wide shadow-[inset_0_1px_0_rgba(0,0,0,0.1)] hover:opacity-95 transition-opacity cursor-pointer"
                        >
                            {t("assessmentProgressBar.ok")}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
