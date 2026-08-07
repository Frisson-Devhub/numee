"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CompetencyReport } from "@/components/dashboard/CompetencyReport";
import { CompetencyOccurrenceChart } from "@/components/dashboard/CompetencyOccurrenceChart";
import { ScoreDistributionChart } from "@/components/dashboard/ScoreDistributionChart";
import { MatchScoreChart } from "@/components/dashboard/MatchScoreChart";
import { MotivationOccurrenceChart } from "@/components/dashboard/MotivationOccurrenceChart";
import { PercentageFace } from "@/components/dashboard/PercentageFace";
import { AssessmentProgressBar } from "@/components/dashboard/AssessmentProgressBar";
import { Spinner } from "@/components/ui/Spinner";
import type {
    DashboardData,
    DashboardDataResponse,
    StoredDashboardData,
    StoredMilestoneDocument,
    StoredMilestoneItem,
    StoredMilestoneStatus,
} from "@/interfaces/types";
import { apiRoutes } from "@/constants/api";
import {
    DASHBOARD_CARD_CLASS,
    DEFAULT_ASSESSMENT_ID,
    getAssessmentOptionsFromIds,
    getDashboardDerivedData,
    getDashboardPayloadFromEntry,
    getNextAssessmentId,
    MAX_ASSESSMENTS_PER_USER,
} from "@/constants/constants";
import { frontendRoutes } from "@/constants/frontendRoutes";
import { ApiCall } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

/** Percent of milestones with status `completed` (hyphen/underscore normalized). */
function milestoneCompletionPercent(milestoneStatus: StoredMilestoneItem[] | null): number {
    if (!Array.isArray(milestoneStatus) || milestoneStatus.length === 0) return 0;
    const completed = milestoneStatus.filter(
        (s) => String(s.status).toLowerCase().replace(/-/g, "_") === "completed"
    ).length;
    return Math.round((completed / milestoneStatus.length) * 100);
}

function allMilestonesCompleted(milestoneStatus: StoredMilestoneItem[] | null): boolean {
    if (!Array.isArray(milestoneStatus) || milestoneStatus.length === 0) return false;
    return milestoneStatus.every(
        (s) => String(s.status).toLowerCase().replace(/-/g, "_") === "completed"
    );
}

/** Union of assessment keys from dashboard JSON + milestone status, sorted by index. */
function getSortedAssessmentIds(data: StoredDashboardData | null, milestoneStatus: StoredMilestoneStatus | null): string[] {
    const fromData = data && typeof data === "object" ? Object.keys(data) : [];
    const fromMs = milestoneStatus && typeof milestoneStatus === "object" ? Object.keys(milestoneStatus) : [];
    const set = new Set<string>([...fromData, ...fromMs]);
    return Array.from(set).sort((a, b) => {
        const na = parseInt(a.replace(/^assessment/, ""), 10) || 0;
        const nb = parseInt(b.replace(/^assessment/, ""), 10) || 0;
        return na - nb;
    });
}

/**
 * Assessment dashboard: selects among keyed assessment payloads, derives chart
 * inputs, and gates “start new assessment” with the per-user limit.
 */
export default function DashboardPage() {
    const { t } = useI18n();
    const [keyedData, setKeyedData] = useState<StoredDashboardData | null>(null);
    const [keyedMilestoneStatus, setKeyedMilestoneStatus] = useState<StoredMilestoneStatus | null>(null);
    const [selectedAssessment, setSelectedAssessment] = useState<string>(DEFAULT_ASSESSMENT_ID);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await ApiCall<{
                success?: boolean;
                data?: StoredDashboardData | null;
                milestoneStatus?: StoredMilestoneStatus | null;
            }>({
                url: apiRoutes.user.dashboardData,
                method: "GET",
            });
            if (cancelled) return;
            if (!res.ok) {
                setError(res.status === 401 ? "Unauthorized" : "Failed to load");
                return;
            }
            const json = res.data;
            if (json?.success) {
                const raw = json.data ?? null;
                const keyed = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
                setKeyedData(keyed);
                const ms = json.milestoneStatus ?? null;
                setKeyedMilestoneStatus(ms && typeof ms === "object" && !Array.isArray(ms) ? ms : {});
            }
        })()
            .catch((e) => {
                if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const assessmentIds = getSortedAssessmentIds(keyedData, keyedMilestoneStatus);
    const effectiveSelected =
        assessmentIds.length > 0 && assessmentIds.includes(selectedAssessment)
            ? selectedAssessment
            : assessmentIds[0] ?? DEFAULT_ASSESSMENT_ID;
    const payload = getDashboardPayloadFromEntry(keyedData?.[effectiveSelected]) ?? null;
    const milestoneDoc: StoredMilestoneDocument | null =
        keyedMilestoneStatus?.[effectiveSelected] ?? null;
    const milestoneStatus = milestoneDoc?.milestones ?? null;
    const resumeAllowed = milestoneDoc?.resume_allowed ?? true;
    const showDropdown = assessmentIds.length >= 2;
    const nextAssessmentId = getNextAssessmentId(assessmentIds);
    const lastAssessmentId = assessmentIds.length > 0 ? assessmentIds[assessmentIds.length - 1] : null;
    const lastMilestoneStatus = lastAssessmentId
        ? (keyedMilestoneStatus?.[lastAssessmentId]?.milestones ?? null)
        : null;
    const lastMilestonePercent = milestoneCompletionPercent(lastMilestoneStatus);
    const lastMilestoneDoc = lastAssessmentId
        ? (keyedMilestoneStatus?.[lastAssessmentId] ?? null)
        : null;
    const lastAssessmentRedFlag = lastMilestoneDoc?.red_flag === true;
    const lastAssessmentClosedEarly =
        lastMilestoneDoc?.resume_allowed === false && lastMilestonePercent <= 10;
    const canStartNewAssessment =
        lastMilestonePercent > 0 ||
        allMilestonesCompleted(lastMilestoneStatus) ||
        ((lastAssessmentRedFlag || lastAssessmentClosedEarly) && lastMilestonePercent <= 10);
    const startNewAssessmentHref =
        nextAssessmentId != null
            ? `${frontendRoutes.questionnaire}?assessmentId=${encodeURIComponent(nextAssessmentId)}`
            : undefined;
    const {
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
    } = getDashboardDerivedData(payload);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-80 gap-4">
                <Spinner className="h-24 w-24 mt-46 text-blue-600" />
                <p className="text-md font-extralight text-gray-500">{t("dashboard.loading")}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-80">
                <div className="text-red-600">
                    {error === "Unauthorized" ? t("dashboard.unauthorized") : t("dashboard.loadFailed")}
                </div>
            </div>
        );
    }

    const assessmentComplete = allMilestonesCompleted(milestoneStatus);
    const cannotResumeAssessment = !resumeAllowed || assessmentComplete;
    const continueDisabledLabel =
        !resumeAllowed && !assessmentComplete
            ? t("dashboard.assessmentClosed")
            : t("dashboard.assessmentComplete");
    const noAssessmentInitiated = assessmentIds.length === 0;
    const startFirstAssessmentHref = noAssessmentInitiated
        ? `${frontendRoutes.questionnaire}?assessmentId=${encodeURIComponent(DEFAULT_ASSESSMENT_ID)}`
        : undefined;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
                <section className="flex-1 min-w-0 w-full" aria-label={t("dashboard.assessmentProgress")}>
                    {noAssessmentInitiated ? (
                        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-end w-full">
                            <Link
                                href={startFirstAssessmentHref!}
                                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-linear-to-r from-[#2D6CD5] to-[#F17E26] text-white font-semibold text-sm tracking-wide shadow-[inset_0_1px_0_rgba(0,0,0,0.1)] hover:opacity-95 transition-opacity w-full sm:w-auto"
                            >
                                {t("dashboard.startAssessment")}
                            </Link>
                        </div>
                    ) : (
                        <AssessmentProgressBar
                            percentage={milestoneCompletionPercent(milestoneStatus)}
                            disableContinueButton={cannotResumeAssessment}
                            continueDisabledLabel={continueDisabledLabel}
                            assessmentId={effectiveSelected}
                            startNewAssessmentHref={startNewAssessmentHref}
                            canStartNewAssessment={canStartNewAssessment}
                            maxAssessmentsReached={assessmentIds.length >= MAX_ASSESSMENTS_PER_USER}
                            isFirstAssessment={assessmentIds.length === 1}
                        />
                    )}
                </section>
                {!noAssessmentInitiated && showDropdown && (
                    <select
                        value={effectiveSelected}
                        onChange={(e) => setSelectedAssessment(e.target.value)}
                        className="h-10 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium text-sm shadow-[0_1px_3px_rgba(0,0,0,0.06)] focus:outline-none focus:ring-2 focus:ring-[#2D6CD5] focus:border-transparent cursor-pointer w-full sm:w-auto sm:shrink-0"
                        aria-label={t("dashboard.selectAssessment")}
                    >
                        {getAssessmentOptionsFromIds(assessmentIds).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                )}
            </div>
            <div className="space-y-4">
                <div className="min-w-0 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">
                    <div className={DASHBOARD_CARD_CLASS}>
                        <section className="">
                            <div className="flex items-start justify-between gap-4 mb-4 pb-2 border-b border-gray-100">
                                <div>
                                    <h2 className="text-base font-bold text-gray-800 mb-1">
                                        {t("dashboard.competencyReport.title")}
                                    </h2>
                                    <p className="text-xs text-gray-500">
                                        {t("dashboard.competencyReport.subtitle")}
                                    </p>
                                </div>
                                <Link href="#" className="text-sm font-semibold text-[#5893F5] hover:text-blue-700 whitespace-nowrap">
                                    {t("dashboard.competencyReport.viewCareerGoal")}
                                </Link>
                            </div>
                            <div className="mb-2 pb-6">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                                    {t("dashboard.competencyReport.identified")}
                                </h3>
                                {competencyReportSkills?.length ? (
                                    <CompetencyReport skills={competencyReportSkills} />
                                ) : (
                                    <div className="space-y-5" aria-hidden>
                                        {[1, 2, 3].map((i) => (
                                            <div key={i}>
                                                <div className="flex justify-between mb-1.5 items-end">
                                                    <span className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                                                    <span className="h-2.5 w-12 bg-gray-200 rounded animate-pulse" />
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                                                    <div
                                                        className="h-5 rounded-full bg-gray-200 animate-pulse"
                                                        style={{ width: `${30 + i * 20}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <section className={`${DASHBOARD_CARD_CLASS} p-2`}>
                                <h2 className="text-base font-bold text-gray-800 mb-1">Competency Occurrence Analysis</h2>
                                <p className="text-xs text-gray-500 mb-4">Occurence Vs Competency</p>
                                {competencyOccurrencePills?.length ? (
                                    <CompetencyOccurrenceChart
                                        times={competencyOccurrenceTimes}
                                        lineData={competencyOccurrenceLineData}
                                        pills={competencyOccurrencePills}
                                    />
                                ) : (
                                    <div aria-hidden>
                                        <div className="h-44 w-full bg-gray-100 rounded-lg animate-pulse" />
                                        <div className="flex justify-between items-center mt-3 gap-2">
                                            {[1, 2, 3].map((i) => (
                                                <span key={i} className="flex-1 h-8 bg-gray-200 rounded-full animate-pulse min-w-6" />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>
                            <section className={DASHBOARD_CARD_CLASS}>
                                <h2 className="text-base font-bold text-gray-800 mb-1">
                                    {t("dashboard.scoreDistribution.title")}
                                </h2>
                                <p className="text-xs text-gray-500 mb-2">{t("dashboard.scoreDistribution.subtitle")}</p>
                                {scoreDistributionItems?.length ? (
                                    <ScoreDistributionChart competencies={scoreDistributionItems} />
                                ) : (
                                    <div className="h-55 w-full flex items-center justify-center min-w-0" aria-hidden>
                                        <div className="relative w-full max-w-70 aspect-240/200 flex items-center justify-center">
                                            <div className="absolute inset-0 rounded-full bg-gray-200 animate-pulse w-36 h-36" />
                                            <div className="absolute rounded-full bg-gray-100 animate-pulse w-24 h-24" />
                                            <div className="absolute rounded-full bg-gray-200 animate-pulse w-20 h-20 right-0 bottom-0" />
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                    <div className={DASHBOARD_CARD_CLASS}>
                        <div>
                            <h2 className="text-base font-bold text-gray-800 mb-1">
                                {t("dashboard.motivationReport.title")}
                            </h2>
                            <p className="text-xs text-gray-500 mb-4 border-b border-b-gray-100 pb-2">
                                {t("dashboard.motivationReport.subtitle")}
                            </p>
                        </div>
                        <section className={`${DASHBOARD_CARD_CLASS} mb-6`}>

                            <div className="">
                                <div className="mb-4">
                                    <h3 className="text-xs font-semibold text-gray-700 mb-2">
                                        {t("dashboard.motivationReport.identified")}
                                    </h3>
                                    {payload?.main_motivations?.length ? (
                                        <div className="flex gap-2">
                                            {motivationBlocks.map((b: { color: string; width: number }, i: number) => (
                                                <div key={i} className={`h-10 rounded-lg ${b.color}`} style={{ flex: b.width }} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex gap-2" aria-hidden>
                                            {[1, 2, 3].map((i) => (
                                                <span key={i} className="h-10 flex-1 rounded-lg bg-gray-200 animate-pulse min-w-6" />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-700 mb-2">
                                        {t("dashboard.motivationReport.strengthScore")}
                                    </h3>
                                    {payload?.main_motivations?.length ? (
                                        <div className="flex flex-wrap items-center gap-4">
                                            {strengthScore.map((s: { label: string; value: number; emoji: string; emojiBg: string; emojiFaceColor: string }) => (
                                                <div key={s.label} className="flex flex-col items-center gap-2 text-sm ">
                                                    <span className="text-sm font-medium text-gray-500">{s.label}</span>
                                                    <div className="flex items-center">
                                                        <span className="inline-flex h-7 w-8 items-center justify-center" aria-hidden>
                                                            <PercentageFace percentage={s.value} size={22} width={28} color={s.emojiFaceColor} />
                                                        </span>
                                                        <span className="text-xs font-mono text-gray-700">{s.value}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap items-center gap-4" aria-hidden>
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="flex flex-col items-center gap-2 text-sm">
                                                    <span className="h-3.5 w-16 bg-gray-200 rounded animate-pulse" />
                                                    <div className="flex items-center gap-1">
                                                        <span className="h-7 w-8 rounded-full bg-gray-200 animate-pulse" />
                                                        <span className="h-3 w-8 bg-gray-100 rounded animate-pulse" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className={DASHBOARD_CARD_CLASS}>
                            <h2 className="text-base font-bold text-gray-800 mb-1">
                                {t("dashboard.motivationReport.occurrenceTitle")}
                            </h2>
                            <p className="text-xs text-gray-500 mb-10">
                                {t("dashboard.motivationReport.occurrenceSubtitle")}
                            </p>
                            {motivationOccurrencePills?.length ? (
                                <MotivationOccurrenceChart
                                    times={motivationOccurrenceTimes}
                                    lineData={motivationOccurrenceLineData}
                                    pills={motivationOccurrencePills}
                                />
                            ) : (
                                <div aria-hidden>
                                    <div className="h-44 w-full bg-gray-100 rounded-lg animate-pulse" />
                                    <div className="flex justify-between items-center mt-3 gap-2">
                                        {[1, 2, 3].map((i) => (
                                            <span key={i} className="flex-1 h-8 bg-gray-200 rounded-full animate-pulse min-w-6" />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>

                </div>

                <div className=" min-w-0 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4">
                    <section className={DASHBOARD_CARD_CLASS}>
                        <h2 className="text-base font-bold text-gray-800 mb-1">{t("dashboard.fitBest.title")}</h2>
                        <p className="text-xs text-gray-500 mb-4 pb-2 border-b border-gray-100">
                            {t("dashboard.fitBest.subtitle")}
                        </p>
                        <div className="mb-4">
                            <h3 className="text-md font-semibold text-gray-500 mb-2">
                                {t("dashboard.fitBest.personalSummary")}
                            </h3>
                            {recommendedJobs?.length ? (
                                <p className="text-sm text-gray-600 leading-relaxed">{personalSummary}</p>
                            ) : (
                                <div className="space-y-2" aria-hidden>
                                    <span className="block h-3 w-full bg-gray-200 rounded animate-pulse" />
                                    <span className="block h-3 w-full max-w-[90%] bg-gray-200 rounded animate-pulse" />
                                    <span className="block h-3 w-4/5 bg-gray-200 rounded animate-pulse" />
                                </div>
                            )}
                        </div>
                        <div className={`w-full flex justify-center items-center`}>
                            {recommendedJobs?.length ? (
                                <MatchScoreChart
                                    jobs={recommendedJobs.map((j: { job_role: string; match_score: number }) => ({ job_role: j.job_role, match_score: j.match_score }))}
                                />
                            ) : (
                                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:min-w-96 w-full" aria-hidden>
                                    <div className="h-5 w-48 mx-auto mb-6 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-48 flex items-end justify-around gap-4 px-2">
                                        {[1, 2, 3].map((i) => (
                                            <span key={i} className="flex-1 max-w-24 h-24 bg-gray-100 rounded-t animate-pulse" />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className={`${DASHBOARD_CARD_CLASS} pb-0`}>
                        <h2 className="text-base font-bold text-gray-800 mb-1">
                            {t("dashboard.careerRecommendations.title")}
                        </h2>
                        {/* <p className="text-xs text-gray-500 mb-4 pb-2 border-b border-gray-100">Showing 24 companies</p> */}
                        <div className="space-y-4">
                            {recommendedJobs?.length ? (
                                (careerRecommendations ?? []).map((rec: { title: string; description: string }, i: number) => (
                                    <div key={i} className="flex gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                                        <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                                            <Image src="/career-avatar.png" alt="" width={32} height={32} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-800 mb-1">{rec.title}</h4>
                                            <p className="text-xs text-gray-600 leading-relaxed">{rec.description}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="space-y-4" aria-hidden>
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                                            <span className="shrink-0 w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                                            <div className="flex-1 space-y-2">
                                                <span className="block h-3.5 w-32 bg-gray-200 rounded animate-pulse" />
                                                <span className="block h-3 w-full bg-gray-100 rounded animate-pulse" />
                                                <span className="block h-3 w-4/5 bg-gray-100 rounded animate-pulse" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
