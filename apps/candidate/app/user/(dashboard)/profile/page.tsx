"use client";

import { useEffect, useState, useRef } from "react";
import {
    Mail,
    Phone,
    MapPin,
    FileText,
    ExternalLink,
    Rocket,
    Brain,
    Target,
    Info,
    GitMerge,
    Lightbulb,
    Code,
    Mic,
    Briefcase,
    User,
    Upload,
    Plus,
} from "lucide-react";
import {
    DASHBOARD_CARD_CLASS,
    DEFAULT_ASSESSMENT_ID,
    getAssessmentOptionsFromIds,
    getDashboardDerivedData,
    getDashboardPayloadFromEntry,
} from "@/constants/constants";
import { apiRoutes } from "@/constants/api";
import { ApiCall } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import type { DashboardData, ProfileData, QuestionAnswerPair } from "@/interfaces/types";

/** Filename segment from a resume URL for display (not the full CDN path). */
function resumeDisplayName(url: string): string {
    try {
        const path = new URL(url).pathname;
        const segment = path.split("/").filter(Boolean).pop() ?? "";
        return segment || "Resume";
    } catch {
        return "Resume";
    }
}

/** Compact LinkedIn href for UI (strips scheme / www). */
function linkedInDisplayUrl(url: string): string {
    try {
        const href = url.startsWith("http") ? url : `https://${url}`;
        const u = new URL(href);
        return u.hostname === "www.linkedin.com" ? `linkedin.com${u.pathname}` : u.hostname + u.pathname;
    } catch {
        return url;
    }
}

/**
 * Profile + assessment picker: resume/LinkedIn upload, and derived dashboard
 * cards for the selected assessment id.
 */
export default function ProfilePage() {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showLinkedInForm, setShowLinkedInForm] = useState(false);
    const [linkedInInput, setLinkedInInput] = useState("");
    const [savingLinkedIn, setSavingLinkedIn] = useState(false);
    const [uploadingResume, setUploadingResume] = useState(false);
    const [showConversation, setShowConversation] = useState(false);
    const [selectedAssessment, setSelectedAssessment] = useState<string>(DEFAULT_ASSESSMENT_ID);
    const [keyedDashboardData, setKeyedDashboardData] = useState<Record<string, { data: DashboardData }>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchProfile = async () => {
        const res = await ApiCall<{ success?: boolean; data?: ProfileData }>({
            url: apiRoutes.user.profile,
            method: "GET",
        });
        if (res.ok && res.data?.success && res.data.data) {
            setProfile({
                fullName: res.data.data.fullName,
                emailOrPhone: res.data.data.emailOrPhone,
                linkedInUrl: res.data.data.linkedInUrl,
                resumeUrl: res.data.data.resumeUrl,
                assistantQuestionAnswers:
                    (res.data.data.assistantQuestionAnswers && typeof res.data.data.assistantQuestionAnswers === "object")
                        ? res.data.data.assistantQuestionAnswers
                        : {},
            });
            setError(null);
        } else {
            setError(res.status === 401 ? "Please sign in." : "Failed to load profile.");
        }
    };

    const fetchDashboardData = async () => {
        const res = await ApiCall<{
            success?: boolean;
            data?: Record<string, { data: DashboardData }>;
        }>({
            url: apiRoutes.user.dashboardData,
            method: "GET",
        });
        if (res.ok && res.data?.success && res.data.data && typeof res.data.data === "object" && !Array.isArray(res.data.data)) {
            setKeyedDashboardData(res.data.data);
            const ids = Object.keys(res.data.data);
            if (ids.length > 0) {
                setSelectedAssessment((prev) => (ids.includes(prev) ? prev : ids.sort()[0]));
            }
        }
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await Promise.all([fetchProfile(), fetchDashboardData()]);
        })().finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    const dashboardData = getDashboardPayloadFromEntry(keyedDashboardData?.[selectedAssessment]) ?? null;

    const handleSaveLinkedIn = async () => {
        const url = linkedInInput.trim();
        if (!url) return;
        setSavingLinkedIn(true);
        const res = await ApiCall<{ success?: boolean; data?: { linkedInUrl?: string } }>({
            url: apiRoutes.user.profile,
            method: "PATCH",
            body: { linkedInUrl: url },
        });
        setSavingLinkedIn(false);
        if (res.ok && res.data?.success) {
            setProfile((p) => (p ? { ...p, linkedInUrl: res.data?.data?.linkedInUrl ?? url } : p));
            setShowLinkedInForm(false);
            setLinkedInInput("");
        }
    };

    const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingResume(true);
        const formData = new FormData();
        formData.set("file", file);
        formData.set("folder", "resumes");
        const uploadRes = await ApiCall<{ url?: string }>({
            url: apiRoutes.uploadDocument,
            method: "POST",
            body: formData,
        });
        if (!uploadRes.ok || !uploadRes.data?.url) {
            setUploadingResume(false);
            e.target.value = "";
            return;
        }
        const patchRes = await ApiCall<{ success?: boolean; data?: { resumeUrl?: string } }>({
            url: apiRoutes.user.profile,
            method: "PATCH",
            body: { resumeUrl: uploadRes.data.url },
        });
        setUploadingResume(false);
        e.target.value = "";
        if (patchRes.ok && patchRes.data?.success && patchRes.data.data?.resumeUrl) {
            setProfile((p) => (p ? { ...p, resumeUrl: patchRes.data!.data!.resumeUrl } : p));
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-80 gap-4">
                <Spinner className="h-24 w-24 text-blue-600" />
                <p className="text-md font-extralight text-gray-500">Loading…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-80">
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top header: avatar, name, assessment dropdown */}
            <div className="bg-linear-to-br from-blue-20 to-indigo-50 rounded-xl p-6 border border-blue-100/60 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 12px, #3b82f6 12px, #3b82f6 13px)" }} />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-white border-2 border-blue-200 overflow-hidden flex items-center justify-center shadow-sm">
                            <User className="h-8 w-8 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{profile?.fullName ?? "—"}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            id="profile-assessment-select"
                            value={selectedAssessment}
                            onChange={(e) => setSelectedAssessment(e.target.value)}
                            className="h-10 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium text-sm shadow-[0_1px_3px_rgba(0,0,0,0.06)] focus:outline-none focus:ring-2 focus:ring-[#2D6CD5] focus:border-transparent cursor-pointer"
                            aria-label="Select assessment"
                        >
                            {getAssessmentOptionsFromIds(
                                Object.keys(keyedDashboardData).length > 0
                                    ? Object.keys(keyedDashboardData).sort()
                                    : [DEFAULT_ASSESSMENT_ID]
                            ).map(({ value, label }) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 min-w-0">
                {/* Left column */}
                <div className="space-y-4">
                    {/* Student Details */}
                    <div className={DASHBOARD_CARD_CLASS}>
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Student Details</h2>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <Mail className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-500">Email Address</p>
                                    <p className="text-sm font-medium text-gray-800">{profile?.emailOrPhone ?? "—"}</p>
                                </div>
                            </li>
                            {/* <li className="flex items-start gap-3">
                                <Phone className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-500">Phone</p>
                                    <p className="text-sm font-medium text-gray-800">+1 (555) 123-4567</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-500">Location</p>
                                    <p className="text-sm font-medium text-gray-800">San Francisco, CA</p>
                                </div>
                            </li> */}
                        </ul>
                    </div>

                    {/* Documents */}
                    <div className={DASHBOARD_CARD_CLASS}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Documents</h2>
                        </div>
                        <ul className="space-y-3">
                            {/* Resume: show name + link or Upload button */}
                            {profile?.resumeUrl ? (
                                <li className="flex items-center justify-between gap-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50/50">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <FileText className="h-5 w-5 text-red-500 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">
                                                {resumeDisplayName(profile.resumeUrl)}
                                            </p>
                                            <p className="text-xs text-gray-500">Resume</p>
                                        </div>
                                    </div>
                                    <a
                                        href={profile.resumeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                                        aria-label="Open resume"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </li>
                            ) : (
                                <li className="flex items-center justify-center gap-2 p-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        className="hidden"
                                        onChange={handleResumeUpload}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingResume}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-[#2D6CD5] to-[#F17E26] text-white font-semibold text-sm tracking-wide shadow-[inset_0_1px_0_rgba(0,0,0,0.1)] hover:opacity-95 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {uploadingResume ? (
                                            <Spinner className="h-4 w-4" />
                                        ) : (
                                            <Upload className="h-4 w-4" />
                                        )}
                                        Upload Resume
                                    </button>
                                </li>
                            )}

                            {/* LinkedIn: show URL or Add button + form */}
                            {profile?.linkedInUrl ? (
                                <li className="flex items-center justify-between gap-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50/50">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="h-5 w-5 rounded bg-[#0a66c2] flex items-center justify-center shrink-0">
                                            <span className="text-[10px] font-bold text-white">in</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-800">LinkedIn Profile</p>
                                            <p className="text-xs text-gray-500 truncate">{linkedInDisplayUrl(profile.linkedInUrl)}</p>
                                        </div>
                                    </div>
                                    <a
                                        href={profile.linkedInUrl.startsWith("http") ? profile.linkedInUrl : `https://${profile.linkedInUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                                        aria-label="Open LinkedIn profile"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </li>
                            ) : showLinkedInForm ? (
                                <li className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                                    <label className="block text-xs font-medium text-gray-600">LinkedIn profile URL</label>
                                    <input
                                        type="url"
                                        value={linkedInInput}
                                        onChange={(e) => setLinkedInInput(e.target.value)}
                                        placeholder="https://linkedin.com/in/yourprofile"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSaveLinkedIn}
                                            disabled={savingLinkedIn || !linkedInInput.trim()}
                                            className="px-4 py-2 rounded-lg bg-linear-to-r from-[#2D6CD5] to-[#F17E26] text-white font-semibold text-sm tracking-wide shadow-[inset_0_1px_0_rgba(0,0,0,0.1)] hover:opacity-95 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {savingLinkedIn ? "Saving…" : "Save"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setShowLinkedInForm(false); setLinkedInInput(""); }}
                                            disabled={savingLinkedIn}
                                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-100"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </li>
                            ) : (
                                <li className="flex items-center justify-center p-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
                                    <button
                                        type="button"
                                        onClick={() => setShowLinkedInForm(true)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-[#2D6CD5] to-[#F17E26] text-white font-semibold text-sm tracking-wide shadow-[inset_0_1px_0_rgba(0,0,0,0.1)] hover:opacity-95 transition-opacity"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add LinkedIn URL
                                    </button>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Career Interest: click to show stored conversation from DB */}
                    {showConversation ? (
                        <div className="rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200 bg-white h-136 flex flex-col">
                            <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50 shrink-0">
                                <h2 className="text-sm font-bold text-gray-800">Conversation</h2>
                                <button
                                    type="button"
                                    onClick={() => setShowConversation(false)}
                                    className="px-4 py-2 rounded-lg bg-linear-to-r from-[#2D6CD5] to-[#F17E26] text-white font-semibold text-sm tracking-wide shadow-[inset_0_1px_0_rgba(0,0,0,0.1)] hover:opacity-95 transition-opacity"
                                >
                                    Back
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-4 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {(() => {
                                    const keyed = profile?.assistantQuestionAnswers;
                                    const pairs =
                                        keyed && typeof keyed === "object" && Array.isArray(keyed[selectedAssessment])
                                            ? (keyed[selectedAssessment] as QuestionAnswerPair[])
                                            : [];
                                    return pairs.length > 0 ? (
                                        pairs.map((pair, i) => (
                                            <div key={i} className="space-y-2">
                                                {pair.assistant.trim() && (
                                                    <div className="flex justify-start">
                                                        <div className="max-w-[85%] rounded-xl rounded-tl-none bg-blue-100 border border-blue-100 px-3 py-2 text-sm text-gray-800">
                                                            <span className="font-medium text-blue-700 text-xs">Alice</span>
                                                            <p className="mt-0.5 whitespace-pre-wrap">{pair.assistant}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {pair.user.trim() && (
                                                    <div className="flex justify-end">
                                                        <div className="max-w-[85%] rounded-xl rounded-tr-none bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-800">
                                                            <span className="font-medium text-gray-500 text-xs">You</span>
                                                            <p className="mt-0.5 whitespace-pre-wrap">{pair.user}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500 text-sm">
                                            <p>No conversation saved yet.</p>
                                            <p className="mt-1">Complete the AI questionnaire or talk to Numi to get conversation.
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowConversation(true)}
                            className="w-full rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200 bg-linear-to-br from-slate-500 to-slate-700 text-white text-left hover:from-slate-600 hover:to-slate-600 transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Rocket className="h-4 w-4 text-blue-300" />
                                <h2 className="text-xs font-bold uppercase tracking-wider text-blue-100">Conversation</h2>
                            </div>
                            <p className="text-md font-bold text-white mb-3">Get your conversation with Numi - AI assistant</p>
                        </button>
                    )}
                </div>

                {/* Right column */}
                <div className="space-y-4">
                    {/* AI Insight */}
                    <div className={DASHBOARD_CARD_CLASS}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Brain className="h-5 w-5 text-[#5893F5]" />
                                <h2 className="text-base font-bold text-gray-800">AI Insight</h2>
                            </div>
                            {/* <span className="text-xs text-gray-500">Generated today at 9:41 AM</span> */}
                        </div>
                        <div className="py-8 px-4 text-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
                            <p className="text-sm font-semibold text-gray-600">Coming soon</p>
                            <p className="text-xs text-gray-500 mt-1">AI Insight is being prepared for you.</p>
                        </div>
                    </div>

                    {/* Competency Report */}
                    <div className={DASHBOARD_CARD_CLASS}>
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="h-5 w-5 text-[#5893F5]" />
                            <h2 className="text-base font-bold text-gray-800">Competency Report</h2>
                            <Info className="h-4 w-4 text-gray-400" />
                        </div>
                        {(() => {
                            const { competencyReportSkills } = getDashboardDerivedData(dashboardData);
                            const items =
                                competencyReportSkills?.map((s) => ({
                                    label: s.name,
                                    value: s.percentage,
                                    color:
                                        s.percentage >= 75
                                            ? "bg-[#5893F5]"
                                            : s.percentage >= 50
                                                ? "bg-[#FAAD14]"
                                                : "bg-red-500",
                                })) ?? null;
                            return items?.length ? (
                                <>
                                    <div className="space-y-4 mb-4">
                                        {items.map((item) => (
                                            <div key={item.label}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-medium text-gray-700">{item.label}</span>
                                                    <span className="font-semibold text-gray-800">{item.value}%</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                    <div
                                                        className={`${item.color} h-2.5 rounded-full transition-all`}
                                                        style={{ width: `${item.value}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray-600 italic">
                                        Observation: Strong technical base. Immediate focus should be on soft skill development to
                                        ensure well-rounded profile.
                                    </p>
                                </>
                            ) : (
                                <div className="space-y-4 mb-4" aria-hidden>
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="h-3.5 w-28 bg-gray-200 rounded animate-pulse" />
                                                <span className="h-3.5 w-10 bg-gray-200 rounded animate-pulse" />
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                <div
                                                    className="h-2.5 rounded-full bg-gray-200 animate-pulse"
                                                    style={{ width: `${25 + i * 20}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <span className="block h-4 w-full max-w-md bg-gray-100 rounded animate-pulse mt-2" />
                                </div>
                            );
                        })()}
                    </div>

                    {/* Triangulation Analysis */}
                    <div className={DASHBOARD_CARD_CLASS}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <GitMerge className="h-5 w-5 text-[#5893F5]" />
                                <h2 className="text-base font-bold text-gray-800">Triangulation Analysis</h2>
                            </div>
                            {/* <button type="button" className="text-sm font-medium text-[#5893F5] hover:text-blue-700">
                                Resume vs Test
                            </button> */}
                        </div>
                        <div className="py-8 px-4 text-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
                            <p className="text-sm font-semibold text-gray-600">Coming soon</p>
                            <p className="text-xs text-gray-500 mt-1">Triangulation Analysis is being prepared for you.</p>
                        </div>
                    </div>

                    {/* AI Recommendations - career recommendations from dashboard */}
                    <div className={DASHBOARD_CARD_CLASS}>
                        <div className="flex items-center gap-2 mb-4">
                            <Lightbulb className="h-5 w-5 text-amber-500" />
                            <h2 className="text-base font-bold text-gray-800">AI Recommendations</h2>
                        </div>
                        {(() => {
                            const { careerRecommendations } = getDashboardDerivedData(dashboardData);
                            const items = careerRecommendations?.length ? careerRecommendations : null;

                            return items?.length ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {items.map((rec, i) => {

                                        return (
                                            <div
                                                key={i}
                                                className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                                            >

                                                <h3 className="font-semibold text-gray-800 mb-1">{rec.title}</h3>
                                                <p className="text-xs text-gray-600">{rec.description || "—"}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-hidden>
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                                            <span className="block h-8 w-8 rounded bg-gray-200 animate-pulse mb-2" />
                                            <span className="block h-4 w-28 bg-gray-200 rounded animate-pulse mb-2" />
                                            <span className="block h-3 w-full bg-gray-100 rounded animate-pulse mb-2" />
                                            <span className="block h-3 w-4/5 bg-gray-100 rounded animate-pulse mb-3" />
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}
