/** Chat turn author: candidate (`user`) or AI persona. */
export type MessageRole = "user" | "persona";

/** Single chat message in the virtual-assistant / Anam UI. */
export interface Message {
    id: string;
    content: string;
    role: MessageRole;
}

/** Connection/UI status for the live assistant session indicator. */
export type StatusType = "normal" | "loading" | "connected" | "error";

/** Milestone status from milestone_tracker API (conversation_status item). */
export interface MilestoneStatusItem {
    milestone: string;
    status: "completed" | "in_progress" | string;
}

/** Payload for POST /api/virtual-assistant/notify-support when user accepts executive handoff. */
export type SupportNotifyPayload = {
    room_name: string;
    reason: string;
    join_url: string;
};

/** Response from POST /api/virtual-assistant/milestone-tracker (proxied from agents/milestone_tracker). */
export interface MilestoneTrackerResponse {
    red_flag?: boolean;
    room_name?: string;
    reason?: string;
    join_url?: string;
    joinurl?: string;
    last_question_milestone?: (null | {
        question?: string;
        milestone?: MilestoneStatusItem[];
    })[];
    current_question?: string;
    milestone_status?: {
        conversation_status: MilestoneStatusItem[];
    };
}

/** Candidate signup form payload (email/phone + profile fields). */
export interface SignupDataInterface {
    firstName: string,
    lastName: string,
    emailOrPhone: string,
    dateOfBirth: string,
    gender: string,
    password: string,
    agreeToTerms: boolean
}

/** Candidate login form payload. */
export interface LoginDataInterface {
    email: string,
    password: string
}

/** User shape returned by admin users API (GET /api/admin/users). */
export interface ApiUser {
    id: string;
    firstName: string;
    lastName: string;
    emailOrPhone: string;
    role: string | null;
    lastLogin: string | null;
    createdAt: string;
}

/** Single assessment: Q&A pairs (user, assistant). */
export type QuestionAnswerPair = { assistant: string; user: string };

/** Stored shape: assessmentId -> array of Q&A pairs. */
export type StoredAssistantQuestionAnswers = Record<string, QuestionAnswerPair[]>;

/** Profile page / API: fullName, contact, links, and stored Q&A by assessment. */
export interface ProfileData {
    fullName: string;
    emailOrPhone: string;
    linkedInUrl?: string;
    resumeUrl?: string;
    assistantQuestionAnswers?: StoredAssistantQuestionAnswers;
}

/** Single assessment dashboard API response: { data, status, message, success }. */
export interface DashboardDataEntry {
    data: DashboardData;
    status: boolean;
    message: string | null;
    success: boolean;
}

/** Stored shape: assessmentId -> dashboard entry. */
export type StoredDashboardData = Record<string, DashboardDataEntry>;

/** Single milestone item stored (key, status). */
export type StoredMilestoneItem = { key: string; status: string };

/** Milestone progress stored on Assessment.milestoneStatus (JSON column). */
export type StoredMilestoneDocument = {
    milestones: StoredMilestoneItem[];
    resume_allowed: boolean;
    /** Set when milestone_tracker returns red_flag; allows starting a new assessment at ≤10% progress. */
    red_flag?: boolean;
};

/** Stored shape: assessmentId -> milestone document. */
export type StoredMilestoneStatus = Record<string, StoredMilestoneDocument>;

/** Dashboard data stored on User and returned by the dashboard API. */
export interface DashboardData {
    questions_and_answers?: Array<{ question: string; answer: string }>;
    competency_report?: Array<{
        competency: string;
        category: string;
        predicted_level: string;
        confidence: number;
        evidence_from_answers: number[];
    }>;
    motivation_report?: Array<{
        factor: string;
        confidence: number;
        evidence_from_answers: number[];
    }>;
    main_competencies?: Array<{
        competency: string;
        strength_score: number;
        ui_score: number;
        level: string;
        confidence: number;
        occurrence: number;
    }>;
    main_motivations?: Array<{
        motivation: string;
        strength_score: number;
        ui_score: number;
        confidence: number;
        occurrence: number;
    }>;
    jobs_report?: {
        recommended_roles?: Array<{
            job_role: string;
            match_score: number;
            reason: string;
        }>;
        why_these_roles?: string;
        professional_summary?: string;
    };
    user_report?: {
        main_competencies?: string[];
        competency_distribution?: number[];
        competency_strength_scores_distribution?: number[];
        competency_level?: string[];
        competency_ui_score?: number[];
        main_motivations?: string[];
        motivation_distribution?: number[];
        motivation_strength_scores_distribution?: number[];
        motivation_ui_score?: number[];
        recommended_jobs?: Array<{
            job_role: string;
            match_score: number;
            reason: string;
        }>;
        why_these_roles?: string;
        professional_summary?: string;
    };
    user_profile?: string;
}

/** API response shape: { success, data: { data: payload } } */
export interface DashboardDataResponse {
    success: boolean;
    data: {
        data: DashboardData | null;
    } | null;
}

/** View-model derived from DashboardData for candidate dashboard charts and cards. */
export interface DashboardDerivedData {
    competencyReportSkills: Array<{ name: string; level: string; percentage: number }> | null;
    scoreDistributionItems: Array<{ name: string; value: number }> | null;
    competencyOccurrenceTimes: number;
    competencyOccurrenceLineData: Array<{ name: string; value: number }> | undefined;
    competencyOccurrencePills: Array<{ label: string; active: boolean; times: number }> | undefined;
    motivationOccurrenceTimes: number;
    motivationOccurrenceLineData: Array<{ name: string; value: number }> | undefined;
    motivationOccurrencePills: Array<{ label: string; active: boolean; times: number }> | undefined;
    recommendedJobs: Array<{ job_role: string; match_score: number; reason: string }>;
    personalSummary: string;
    careerRecommendations: Array<{ title: string; description: string }> | null;
    strengthScore: Array<{ label: string; value: number; emoji: string; emojiBg: string; emojiFaceColor: string }>;
    motivationBlocks: Array<{ color: string; width: number }>;
}

/** Props for the admin bulk-onboard modal (template download + CSV upload). */
export interface OnBoardModalProps {
    open: boolean;
    onClose: () => void;
    onDownloadTemplate?: () => void;
    onBulkUpload?: (file: File) => void | Promise<void>;
}

/** Props for the questionnaire assessment progress bar and continue / start-new CTAs. */
export interface AssessmentProgressBarProps {
    percentage?: number;
    disableContinueButton?: boolean;
    /** Label when continue is disabled (default: "Assessment Complete"). */
    continueDisabledLabel?: string;
    /** When provided, "Continue assessment" links to the questionnaire with this assessment selected (e.g. assessment1). */
    assessmentId?: string;
    /** When provided, shows a "Start New Assessment" button linking to this href (e.g. questionnaire?assessmentId=assessment2). */
    startNewAssessmentHref?: string;
    /** When false, clicking "Start new assessment" shows a popup instead of navigating. Set false when current assessment has 0 milestones achieved. */
    canStartNewAssessment?: boolean;
    /** When true, show "Start new assessment" button that opens a "limit reached" popup. */
    maxAssessmentsReached?: boolean;
    /** When true and canStartNewAssessment is false, the popup shows "Start Your First Assessment" message (user has only one assessment). */
    isFirstAssessment?: boolean;
}