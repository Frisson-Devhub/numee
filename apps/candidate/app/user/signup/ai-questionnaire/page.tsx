"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AvatarLipsyncAssistant } from "@/components/dashboard/AvatarLipsyncAssistant";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthFormHeading } from "@/components/auth/AuthFormHeading";
import { useI18n } from "@/contexts/I18nContext";
import { apiRoutes } from "@/constants/api";
import { DEFAULT_ASSESSMENT_ID, isAssessmentIdWithinLimit } from "@/constants/constants";
import { USE_LIVEKIT_AUDIO_VISUALIZER } from "@/constants/featureFlags";
import { frontendRoutes } from "@/constants/frontendRoutes";
import type { QuestionAnswerPair, StoredMilestoneDocument, StoredMilestoneItem } from "@/interfaces/types";
import { parseStoredMilestoneStatus } from "@/lib/milestone-status";
import { ApiCall } from "@/lib/utils";

/** Resolve `?assessmentId=` or fall back to `assessment1` when missing/out of range. */
function assessmentIdFromSearchParams(searchParams: ReturnType<typeof useSearchParams>): string {
    const id = searchParams.get("assessmentId")?.trim();
    if (id && isAssessmentIdWithinLimit(id)) return id;
    return DEFAULT_ASSESSMENT_ID;
}

/**
 * Loads prior Q&A + milestones for the assessment, then mounts
 * `AvatarLipsyncAssistant` (blocks resume when `resume_allowed` is false).
 */
export default function AIQuestionnairePage() {
    const router = useRouter();
    const { t } = useI18n();
    const searchParams = useSearchParams();
    const assessmentId = assessmentIdFromSearchParams(searchParams);

    const [assistantQuestionAnswers, setAssistantQuestionAnswers] = useState<
        QuestionAnswerPair[] | null
    >(null);
    const [milestoneStatus, setMilestoneStatus] = useState<StoredMilestoneItem[] | null>(null);
    const [resumeBlocked, setResumeBlocked] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await ApiCall<{
                success?: boolean;
                assistantQuestionAnswers?: QuestionAnswerPair[];
                milestoneStatus?: StoredMilestoneDocument | null;
                resumeAllowed?: boolean;
            }>({
                url: `${apiRoutes.user.aiQuestionnaireState}?assessmentId=${encodeURIComponent(assessmentId)}`,
                method: "GET",
            });
            if (cancelled) return;
            if (res.ok && res.data?.success) {
                const doc = parseStoredMilestoneStatus(res.data.milestoneStatus);
                const canResume =
                    res.data.resumeAllowed !== undefined
                        ? res.data.resumeAllowed
                        : doc.resume_allowed;
                if (!canResume) {
                    setResumeBlocked(true);
                    setLoaded(true);
                    router.replace(frontendRoutes.dashboard);
                    return;
                }
                setAssistantQuestionAnswers(
                    Array.isArray(res.data.assistantQuestionAnswers)
                        ? res.data.assistantQuestionAnswers
                        : null
                );
                setMilestoneStatus(doc.milestones);
            }
            setLoaded(true);
        })();
        return () => {
            cancelled = true;
        };
    }, [assessmentId, router]);

    return (
        <AuthLayout
            maxWidth="max-w-7xl"
            hideSidebar
            fillViewport
            fitViewport
            background="bg-gradient-to-br from-blue-500 to-orange-500 relative overflow-hidden"
        >
            {/*
              * Decorative glows deliberately overhang the container, so they need their own
              * clipping layer: unclipped they add scroll height to the auth column and put a
              * scrollbar on a page that otherwise fits one viewport.
              */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-125 h-125 bg-blue-600/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-125 h-125 bg-orange-500/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative z-10 flex w-full flex-col flex-1 min-h-0 max-md:overflow-hidden">
                <div className="hidden md:flex items-start justify-between gap-4 shrink-0">
                    <AuthFormHeading
                        title={t("aiQuestionnaire.page.title")}
                        subtitle={t("aiQuestionnaire.page.subtitle")}
                        dark
                    />
                    <div className="shrink-0 pt-1">
                        <LanguageToggle variant="inline" />
                    </div>
                </div>
                <div className="flex md:hidden w-full items-center justify-between shrink-0 py-1 max-md:px-0">
                    <Link
                        href="/user/dashboard"
                        className="inline-flex shrink-0 focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
                    >
                        <Image
                            src="/numee-logo.png"
                            alt="NuMee"
                            width={120}
                            height={40}
                            className="h-8 w-auto"
                            priority
                        />
                    </Link>
                    <LanguageToggle variant="inline" />
                </div>
                <div className="flex-1 min-h-0 max-md:overflow-hidden mt-0 md:mt-6">
                    {!resumeBlocked && loaded && (
                        <AvatarLipsyncAssistant
                            useLiveKitVisualizer={USE_LIVEKIT_AUDIO_VISUALIZER}
                            assessmentId={assessmentId}
                            initialQuestionAnswerPairs={
                                Array.isArray(assistantQuestionAnswers) &&
                                assistantQuestionAnswers.length > 0
                                    ? assistantQuestionAnswers
                                    : undefined
                            }
                            initialMilestoneStatus={
                                Array.isArray(milestoneStatus) && milestoneStatus.length > 0
                                    ? milestoneStatus
                                    : undefined
                            }
                            disableStartAfterFirstClick
                        />
                    )}
                </div>
            </div>
        </AuthLayout>
    );
}
