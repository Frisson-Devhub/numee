"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, MessageSquare, Video } from "lucide-react";
import { Room, RoomEvent, createLocalAudioTrack, Track } from "livekit-client";
import type {
    LocalAudioTrack,
    RemoteAudioTrack,
    Room as RoomType,
    TranscriptionSegment,
    RemoteTrack,
} from "livekit-client";
import { GradientButton } from "../ui/GradientButton";
import { Spinner } from "../ui/Spinner";
import { Modal } from "../ui/Modal";
import { apiRoutes } from "@/constants/api";
import { MILESTONE_CONFIG } from "@/constants/constants";
import { frontendRoutes } from "@/constants/frontendRoutes";
import type { AgentState } from "@livekit/components-react";
import { AgentAudioVisualizerAura } from "@/components/agent-audio-visualizer-aura";
import { CircularMilestoneProgress } from "./CircularMilestoneProgress";
import { Milestone } from "./Milestone";
import { ApiCall } from "@/lib/utils";
import { randomId } from "@/lib/randomId";
import {
    getMilestoneCompletionPercent,
    milestonesToUiFormat,
    parseStoredMilestoneStatus,
} from "@/lib/milestone-status";
import useConfirmOnExit from "@/hooks/useConfirmOnExit";
import { useI18n } from "@/contexts/I18nContext";
import { getApiLanguage, type AiQuestionnaireStatusKey } from "@/lib/i18n";
import type {
    Message,
    MessageRole,
    StatusType,
    MilestoneTrackerResponse,
    MilestoneStatusItem,
    SupportNotifyPayload,
} from "@/interfaces/types";

function statusColor(type: StatusType): string {
    switch (type) {
        case "loading":
            return "text-amber-400";
        case "connected":
            return "text-emerald-400";
        case "error":
            return "text-rose-400";
        default:
            return "text-slate-400";
    }
}

/** Collapse consecutive messages with the same role by appending content. */
function collapseSameRole(messages: Message[]): { role: MessageRole; content: string }[] {
    if (messages.length === 0) return [];
    const collapsed: { role: MessageRole; content: string }[] = [];
    for (const msg of messages) {
        const content = (msg.content ?? "").trim();
        if (!content) continue;
        const last = collapsed[collapsed.length - 1];
        if (last && last.role === msg.role) {
            last.content = `${last.content} ${content}`.trim();
        } else {
            collapsed.push({ role: msg.role, content });
        }
    }
    return collapsed;
}

/** Cap mobile assistant caption so it does not grow past ~4 lines and push the video circle up. */
function clampTextToLines(text: string, maxLines = 4, charsPerLine = 38): string {
    const trimmed = text.trim();
    if (!trimmed) return "";
    const maxChars = maxLines * charsPerLine;
    if (trimmed.length <= maxChars) return trimmed;
    const slice = trimmed.slice(0, maxChars);
    const lastSpace = slice.lastIndexOf(" ");
    const cut =
        lastSpace > maxChars * 0.55 ? slice.slice(0, lastSpace) : slice.trimEnd();
    return `${cut}...`;
}

/** Derive question/answer pairs: each persona message is a question, the next user message is the answer. Same-role consecutive messages are merged. */
function getQuestionAnswerPairs(messages: Message[]): { assistant: string; user: string }[] {
    const collapsed = collapseSameRole(messages);
    const pairs: { assistant: string; user: string }[] = [];
    for (let i = 0; i < collapsed.length - 1; i++) {
        if (collapsed[i].role === "persona" && collapsed[i + 1].role === "user") {
            pairs.push({
                assistant: collapsed[i].content,
                user: collapsed[i + 1].content,
            });
        }
    }
    return pairs;
}

async function saveQuestionAnswerPairs(
    pairs: { assistant: string; user: string }[],
    assessmentId: string,
    callMasterAgent = false
) {
    if (pairs.length === 0) return;
    try {
        const questionAnswerPairs = pairs.map((p) => ({ assistant: p.assistant, user: p.user }));
        const res = await ApiCall({
            url: apiRoutes.anam.saveMessages,
            method: "POST",
            body: { questionAnswerPairs, assessmentId, callMasterAgent },
        });
        if (!res.ok) {
            console.error("Failed to save assistant Q&A:", res.error ?? res.data);
        }
    } catch (err) {
        console.error("Save assistant Q&A error:", err);
    }
}

/** Flatten conversation_status when it is an array of arrays (API can return [[items], [items]]). */
function flattenToMilestoneItems(raw: unknown): MilestoneStatusItem[] {
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const first = raw[0];
    if (Array.isArray(first)) {
        const flat = raw.flat();
        return flat.filter(
            (s): s is MilestoneStatusItem =>
                s != null && typeof s === "object" && typeof (s as MilestoneStatusItem).milestone === "string"
        );
    }
    return raw.filter(
        (s): s is MilestoneStatusItem =>
            s != null && typeof s === "object" && typeof (s as MilestoneStatusItem).milestone === "string"
    );
}

/** Extract conversation_status array: prefer milestone_status.conversation_status, else last non-null last_question_milestone[].milestone. */
function getConversationStatus(data: MilestoneTrackerResponse | null): MilestoneStatusItem[] | null {
    const raw = data?.milestone_status?.conversation_status;
    const fromConversation = flattenToMilestoneItems(raw);
    if (fromConversation.length > 0) return fromConversation;
    const lastQuestion = data?.last_question_milestone;
    if (!Array.isArray(lastQuestion)) return null;
    for (let i = lastQuestion.length - 1; i >= 0; i--) {
        const entry = lastQuestion[i];
        if (entry && Array.isArray(entry.milestone) && entry.milestone.length > 0) {
            return entry.milestone;
        }
    }
    return null;
}

function normalizeMilestoneKeyForMerge(key: string): string {
    return String(key ?? "").trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}
function normalizeStatusForMerge(s: string): string {
    return String(s ?? "").trim().toLowerCase().replace(/-/g, "_");
}

/** Merge API response into previous state: keep "completed" from prev (DB), only update in_progress/incomplete from API. Full list from MILESTONE_CONFIG so completed milestones not in API response are preserved. */
function mergePreservingCompleted(
    prev: MilestoneStatusItem[] | null,
    fromApi: MilestoneStatusItem[] | null
): MilestoneStatusItem[] | null {
    if (!fromApi || fromApi.length === 0) return prev;
    const prevByKey = new Map<string, { milestone: string; status: string }>();
    if (Array.isArray(prev)) {
        prev.forEach((s) =>
            prevByKey.set(normalizeMilestoneKeyForMerge(s.milestone), {
                milestone: s.milestone,
                status: normalizeStatusForMerge(s.status),
            })
        );
    }
    const fromApiByKey = new Map<string, MilestoneStatusItem>();
    fromApi.forEach((s) =>
        fromApiByKey.set(normalizeMilestoneKeyForMerge(s.milestone), s)
    );
    return MILESTONE_CONFIG.map((c) => {
        const key = normalizeMilestoneKeyForMerge(c.key);
        const prevItem = prevByKey.get(key);
        const apiItem = fromApiByKey.get(key);
        if (prevItem?.status === "completed") {
            return { milestone: c.key, status: "completed" };
        }
        if (apiItem) return { milestone: c.key, status: apiItem.status };
        if (prevItem) return { milestone: c.key, status: prevItem.status };
        return { milestone: c.key, status: "incomplete" };
    });
}

/** When the tracker returns `red_flag`, normalize room/reason/join URL for support notify; else null. */
function getSupportNotifyPayload(data: MilestoneTrackerResponse): SupportNotifyPayload | null {
    if (data.red_flag !== true) return null;
    const room_name = data.room_name;
    const reason = data.reason;
    const join_url = data.join_url ?? data.joinurl;
    if (
        typeof room_name !== "string" ||
        typeof reason !== "string" ||
        typeof join_url !== "string"
    ) {
        return null;
    }
    return { room_name, reason, join_url };
}

async function notifySupport(payload: SupportNotifyPayload) {
    const res = await ApiCall({
        url: apiRoutes.virtualAssistant.notifySupport,
        method: "POST",
        body: payload,
    });
    if (!res.ok) {
        throw new Error(res.error ?? "Failed to notify support");
    }
}

async function fetchMilestoneTracker(
    assessmentId: string,
    currentQuestionAskedByAssistant: string,
    onStatus: (status: MilestoneStatusItem[] | null) => void,
    onRedFlag?: (payload: SupportNotifyPayload) => void
) {
    try {
        const res = await ApiCall<MilestoneTrackerResponse>({
            url: apiRoutes.virtualAssistant.milestoneTracker,
            method: "POST",
            body: {
                assessmentId,
                current_question_asked_by_assistant: currentQuestionAskedByAssistant,
            },
        });
        if (res.ok && res.data) {
            const supportPayload = getSupportNotifyPayload(res.data);
            if (supportPayload) {
                onRedFlag?.(supportPayload);
            }
            const statusList = getConversationStatus(res.data);
            if (statusList && statusList.length > 0) {
                onStatus(statusList);
            }
        }
    } catch (err) {
        console.error("Milestone tracker error:", err);
    }
}

/** Treat local participant as user; any other participant (e.g. agent) as persona. */
function getRoleFromParticipant(
    participant: { identity?: string; sid?: string } | null,
    localIdentity: string
): MessageRole {
    if (!participant?.identity) return "persona";
    return participant.identity === localIdentity ? "user" : "persona";
}

/** Convert saved Q&A pairs to Message[] for the conversation view (persona then user per pair). */
function questionAnswerPairsToMessages(
    pairs: { assistant: string; user: string }[]
): Message[] {
    const messages: Message[] = [];
    pairs.forEach((p, i) => {
        const a = (p.assistant ?? "").trim();
        const u = (p.user ?? "").trim();
        if (a) {
            messages.push({
                id: `persona-initial-${i}-${Date.now()}`,
                content: a,
                role: "persona",
            });
        }
        if (u) {
            messages.push({
                id: `user-initial-${i}-${Date.now()}`,
                content: u,
                role: "user",
            });
        }
    });
    return messages;
}

/** DB stores { key, status }; tracker API and Milestone use { milestone, status }. */
/** Map connection + transcript activity onto the LiveKit `AgentState` the Aura shader reads. */
function deriveAgentVisualizerState(
    isConnected: boolean,
    statusType: StatusType,
    liveTranscript: { user: string; persona: string }
): AgentState {
    if (!isConnected) {
        return statusType === "loading" ? "connecting" : "disconnected";
    }
    if (statusType === "loading") return "connecting";
    if (liveTranscript.persona.trim()) return "speaking";
    if (liveTranscript.user.trim()) return "thinking";
    return "listening";
}

export function AvatarLipsyncAssistant({
    assessmentId = "assessment1",
    initialQuestionAnswerPairs,
    initialMilestoneStatus,
    disableStartAfterFirstClick = false,
    useLiveKitVisualizer = false,
}: {
    /** Assessment key for storing/loading Q&A and milestones (e.g. assessment1, assessment2). */
    assessmentId?: string;
    /** Populate conversation from DB when resuming the AI questionnaire */
    initialQuestionAnswerPairs?: { assistant: string; user: string }[];
    /** Populate Progress panel from DB (milestone status in progress). Accepts { key, status }[] or { milestone, status }[]. */
    initialMilestoneStatus?: Array<{ key?: string; milestone?: string; status: string }> | null;
    /** When true, disable "Start conversation" after it has been clicked once (e.g. on signup ai-questionnaire page). */
    disableStartAfterFirstClick?: boolean;
    /** Render the LiveKit audio visualizer on the stage instead of the Anam avatar video. */
    useLiveKitVisualizer?: boolean;
} = {}) {
    const router = useRouter();
    const { t, locale } = useI18n();
    const [status, setStatus] = useState<{
        key: AiQuestionnaireStatusKey;
        type: StatusType;
        customMessage?: string;
    }>({
        key: "readyToConnect",
        type: "normal",
    });
    const [isConnected, setIsConnected] = useState(false);
    const [hasStartedConversation, setHasStartedConversation] = useState(false);
    const [hasClickedStartOnce, setHasClickedStartOnce] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    /** Live interim text as voice is being spoken (real-time), keyed by role. */
    const [liveTranscript, setLiveTranscript] = useState<{ user: string; persona: string }>({
        user: "",
        persona: "",
    });
    const [isEnding, setIsEnding] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    /** True when LiveKit / Anam video is playing (remote track or stream URL). */
    const [avatarVideoActive, setAvatarVideoActive] = useState(false);
    /** Remote agent audio, fed to the Aura visualizer when it replaces the avatar video. */
    const [remoteAgentAudioTrack, setRemoteAgentAudioTrack] = useState<RemoteAudioTrack | null>(
        null,
    );
    const [isDisable, setIsDisabled] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [milestoneStatus, setMilestoneStatus] = useState<MilestoneStatusItem[] | null>(null);
    const [showExecutiveConnectDialog, setShowExecutiveConnectDialog] = useState(false);
    const [supportNotifyPayload, setSupportNotifyPayload] = useState<SupportNotifyPayload | null>(
        null
    );
    const [isNotifyingSupport, setIsNotifyingSupport] = useState(false);
    const [mobileView, setMobileView] = useState<"video" | "chat">("video");
    const conversationIdRef = useRef<string | null>(null);
    const messagesRef = useRef<Message[]>([]);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const hasEndedRef = useRef(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoTrackRef = useRef<RemoteTrack | null>(null);
    const roomRef = useRef<RoomType | null>(null);
    const localMicRef = useRef<LocalAudioTrack | null>(null);
    const remoteAudioElementsRef = useRef<HTMLMediaElement[]>([]);
    const remoteAgentAudioTrackRef = useRef<RemoteAudioTrack | null>(null);
    const seenSegmentIdsRef = useRef<Set<string>>(new Set());
    const initialLiveClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasAddedPersonaMessageRef = useRef(false);
    const hasInitializedFromPropsRef = useRef(false);
    /** Number of question/answer pairs we have already persisted; save incrementally when this increases or last pair content grows. */
    const lastSavedPairsCountRef = useRef(0);
    /** Last pair we saved (assistant + user) so we can re-save when the same pair gets more content (e.g. more user chunks). */
    const lastSavedLastPairRef = useRef<{ assistant: string; user: string } | null>(null);
    useConfirmOnExit();

    /** Load milestone status from DB on mount / when assessmentId changes so Progress panel reflects database. */
    useEffect(() => {
        (async () => {
            try {
                const res = await ApiCall<{
                    success?: boolean;
                    milestoneStatus?: unknown;
                    resumeAllowed?: boolean;
                }>({ url: `${apiRoutes.user.aiQuestionnaireState}?assessmentId=${encodeURIComponent(assessmentId)}`, method: "GET" });
                if (!res.ok || !res.data?.success) return;
                const doc = parseStoredMilestoneStatus(res.data.milestoneStatus);
                const canResume =
                    res.data.resumeAllowed !== undefined
                        ? res.data.resumeAllowed
                        : doc.resume_allowed;
                if (!canResume) return;
                const mapped = milestonesToUiFormat(doc.milestones);
                if (mapped.length > 0) {
                    setMilestoneStatus(mapped);
                    setHasStartedConversation(true);
                }
            } catch {
                // ignore
            }
        })();
    }, [assessmentId]);

    useEffect(() => {
        if (hasInitializedFromPropsRef.current) return;
        const hasPairs =
            Array.isArray(initialQuestionAnswerPairs) && initialQuestionAnswerPairs.length > 0;
        const hasMilestones =
            Array.isArray(initialMilestoneStatus) && initialMilestoneStatus.length > 0;
        if (!hasPairs && !hasMilestones) return;

        if (hasPairs) {
            const pairs = initialQuestionAnswerPairs!;
            const msgs = questionAnswerPairsToMessages(pairs);
            setMessages(msgs);
            lastSavedPairsCountRef.current = pairs.length;
            lastSavedLastPairRef.current =
                pairs.length > 0 ? pairs[pairs.length - 1] : null;
            if (msgs.some((m) => m.role === "persona")) hasAddedPersonaMessageRef.current = true;
        }
        if (hasMilestones) {
            const mapped = initialMilestoneStatus!
                .map((s) => ({
                    milestone:
                        (s as { key?: string }).key ??
                        (s as { milestone?: string }).milestone ??
                        "",
                    status: s.status,
                }))
                .filter((s): s is MilestoneStatusItem => s.milestone.length > 0);
            if (mapped.length > 0) setMilestoneStatus(mapped);
        }
        setHasStartedConversation(true);
        hasInitializedFromPropsRef.current = true;
    }, [initialQuestionAnswerPairs, initialMilestoneStatus]);

    useEffect(() => {
        messagesRef.current = messages;
        //   setIsDisabled(true);
    }, [messages]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, liveTranscript]);

    function handleDisable() {
        setIsDisabled(true);

        const timer = setTimeout(() => {
            setIsDisabled(false);
        }, 30000);

        return () => clearTimeout(timer);
    }


    const updateStatus = useCallback(
        (key: AiQuestionnaireStatusKey, type: StatusType = "normal", customMessage?: string) => {
            setStatus({ key, type, customMessage });
        },
        []
    );

    const addTranscriptMessage = useCallback((text: string, role: MessageRole) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setMessages((prev) => {
            const next: Message[] = [
                ...prev,
                {
                    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    content: trimmed,
                    role,
                },
            ];
            const pairs = getQuestionAnswerPairs(next);
            const lastPair = pairs.length > 0 ? pairs[pairs.length - 1] : null;
            const newPairCompleted = pairs.length > lastSavedPairsCountRef.current;
            const lastPairContentGrew =
                lastPair &&
                (lastSavedLastPairRef.current === null ||
                    lastPair.assistant !== lastSavedLastPairRef.current.assistant ||
                    lastPair.user !== lastSavedLastPairRef.current.user);
            if (pairs.length > 0 && (newPairCompleted || lastPairContentGrew)) {
                lastSavedPairsCountRef.current = pairs.length;
                lastSavedLastPairRef.current = lastPair;
                saveQuestionAnswerPairs(pairs, assessmentId).catch((err) =>
                    console.error("Incremental save conversation error:", err)
                );
            }
            return next;
        });
    }, [assessmentId]);

    const stopConversation = useCallback(() => {
        const v = videoRef.current;
        const remoteVideo = remoteVideoTrackRef.current;
        if (remoteVideo && v) {
            try {
                remoteVideo.detach(v);
            } catch {
                // ignore
            }
        }
        remoteVideoTrackRef.current = null;
        if (v) {
            v.pause();
            v.removeAttribute("src");
            v.src = "";
            v.srcObject = null;
        }
        setAvatarVideoActive(false);
        remoteAgentAudioTrackRef.current = null;
        setRemoteAgentAudioTrack(null);
        // Stop all remote audio elements immediately
        remoteAudioElementsRef.current.forEach((el) => {
            try {
                el.pause();
                el.srcObject = null;
                if (el.parentNode) el.parentNode.removeChild(el);
            } catch (err) {
                // ignore
            }
        });
        remoteAudioElementsRef.current = [];

        const room = roomRef.current;
        if (room) {
            roomRef.current = null;
            try {
                room.disconnect();
            } catch (err) {
                console.error("Error disconnecting room:", err);
            }
        }
        const mic = localMicRef.current;
        if (mic) {
            localMicRef.current = null;
            try {
                mic.stop();
            } catch (err) {
                console.error("Error stopping mic:", err);
            }
        }
        seenSegmentIdsRef.current.clear();
        hasAddedPersonaMessageRef.current = false;
        lastSavedPairsCountRef.current = 0;
        lastSavedLastPairRef.current = null;
        if (initialLiveClearTimeoutRef.current) {
            clearTimeout(initialLiveClearTimeoutRef.current);
            initialLiveClearTimeoutRef.current = null;
        }
        setMessages([]);
        setLiveTranscript({ user: "", persona: "" });
        setConversationId(null);
        setMilestoneStatus(null);
        conversationIdRef.current = null;
        setIsConnected(false);
        setIsEnding(false);
        updateStatus("disconnected", "normal");
    }, [updateStatus]);

    const endConversation = useCallback(async () => {
        if (hasEndedRef.current) return;
        hasEndedRef.current = true;
        setIsEnding(true);
        const currentMessages = messagesRef.current;
        const pairs = getQuestionAnswerPairs(currentMessages);
        if (pairs.length > 0) {
            try {
                await saveQuestionAnswerPairs(pairs, assessmentId, true);
            } catch (err) {
                console.error("Failed to save conversation:", err);
            }
        }
        stopConversation();
        router.push(frontendRoutes.dashboard);
    }, [stopConversation, router, assessmentId]);

    const startConversation = useCallback(async () => {
        if (disableStartAfterFirstClick) setHasClickedStartOnce(true);
        setHasStartedConversation(true);
        hasEndedRef.current = false;
        seenSegmentIdsRef.current.clear();
        hasAddedPersonaMessageRef.current = false;
        try {
            updateStatus("connecting", "loading");
            setIsConnected(false);

            const milestoneRes = await ApiCall<{
                success?: boolean;
                milestoneStatus?: unknown;
                resumeAllowed?: boolean;
            }>({ url: `${apiRoutes.user.aiQuestionnaireState}?assessmentId=${encodeURIComponent(assessmentId)}`, method: "GET" });
            if (milestoneRes.ok && milestoneRes.data?.success) {
                const doc = parseStoredMilestoneStatus(milestoneRes.data.milestoneStatus);
                const canResume =
                    milestoneRes.data.resumeAllowed !== undefined
                        ? milestoneRes.data.resumeAllowed
                        : doc.resume_allowed;
                if (!canResume) {
                    updateStatus("assessmentClosed", "error");
                    return;
                }
                const mapped = milestonesToUiFormat(doc.milestones);
                if (mapped.length > 0) setMilestoneStatus(mapped);
            }

            const response = await ApiCall<{
                url?: string;
                token?: string;
                stream_url?: string;
                video_url?: string;
                embed_url?: string;
                error?: string;
            }>({ url: apiRoutes.virtualAssistant.getToken, method: "POST" });

            if (!response.ok) {
                throw new Error(response.data?.error ?? response.error ?? "Failed to get session token");
            }

            const data = response.data;
            const url = data?.url;
            const token = data?.token;
            if (!url || !token) {
                throw new Error("Invalid token response: missing url or token");
            }

            const cid =
                typeof (data as { conversation_id?: string }).conversation_id === "string"
                    ? (data as { conversation_id: string }).conversation_id
                    : randomId();
            setConversationId(cid);
            conversationIdRef.current = cid;

            const room = new Room();
            roomRef.current = room;

            await room.connect(url, token);
            updateStatus("connected", "connected");
            setIsConnected(true);

            handleDisable();

            const micTrack = await createLocalAudioTrack();
            localMicRef.current = micTrack;
            await room.localParticipant.publishTrack(micTrack);

            if (isMuted) {
                micTrack.mute();
            }

            await ApiCall({
                url: apiRoutes.virtualAssistant.dispatchAgent,
                method: "POST",
                body: {
                    assessmentId,
                    locale,
                    language: getApiLanguage(locale),
                },
            });

            room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
                if (track.kind === Track.Kind.Video) {
                    if (useLiveKitVisualizer) return;
                    const el = videoRef.current;
                    if (el) {
                        try {
                            el.pause();
                            el.removeAttribute("src");
                            el.src = "";
                            el.srcObject = null;
                        } catch {
                            // ignore
                        }
                        track.attach(el);
                        remoteVideoTrackRef.current = track;
                        el.muted = true;
                        el.playsInline = true;
                        setAvatarVideoActive(true);
                        void el.play().catch(() => {});
                    }
                    return;
                }
                if (track.kind === Track.Kind.Audio) {
                    const audioTrack = track as RemoteAudioTrack;
                    remoteAgentAudioTrackRef.current = audioTrack;
                    setRemoteAgentAudioTrack(audioTrack);
                    const el = track.attach();
                    el.autoplay = true;
                    document.body.appendChild(el);
                    remoteAudioElementsRef.current.push(el);
                }
            });

            room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
                if (track.kind === Track.Kind.Audio) {
                    if (remoteAgentAudioTrackRef.current === track) {
                        remoteAgentAudioTrackRef.current = null;
                        setRemoteAgentAudioTrack(null);
                    }
                    return;
                }
                if (track.kind !== Track.Kind.Video) return;
                const el = videoRef.current;
                if (el) {
                    try {
                        track.detach(el);
                    } catch {
                        // ignore
                    }
                }
                remoteVideoTrackRef.current = null;
                setAvatarVideoActive(false);
            });

            room.on(
                RoomEvent.TranscriptionReceived,
                (segments: TranscriptionSegment[], participant) => {
                    const localIdentity = room.localParticipant.identity;
                    const role: MessageRole = getRoleFromParticipant(participant ?? null, localIdentity);
                    const key = role === "user" ? "user" : "persona";

                    const finalTexts: string[] = [];
                    const interimTexts: string[] = [];

                    segments.forEach((segment) => {
                        const text = segment.text?.trim() ?? "";
                        if (!text) return;
                        if (segment.final) {
                            if (!seenSegmentIdsRef.current.has(segment.id)) {
                                seenSegmentIdsRef.current.add(segment.id);
                                finalTexts.push(text);
                            }
                        } else {
                            interimTexts.push(text);
                        }
                    });

                    const combinedFinal = finalTexts.join(" ").trim();
                    const isFirstPersonaMessage =
                        role === "persona" && combinedFinal && !hasAddedPersonaMessageRef.current;

                    // First assistant sentence: show in live "speaking" section first (backend often sends no interim for it)
                    if (isFirstPersonaMessage) {
                        if (initialLiveClearTimeoutRef.current) {
                            clearTimeout(initialLiveClearTimeoutRef.current);
                        }
                        setLiveTranscript((prev) => ({ ...prev, persona: combinedFinal }));
                        initialLiveClearTimeoutRef.current = setTimeout(() => {
                            initialLiveClearTimeoutRef.current = null;
                            setLiveTranscript((prev) => ({ ...prev, persona: "" }));
                        }, 2500);
                    }

                    if (combinedFinal) {
                        if (role === "persona") {
                            hasAddedPersonaMessageRef.current = true;
                            fetchMilestoneTracker(
                                assessmentId,
                                combinedFinal,
                                (statusList) => {
                                    setMilestoneStatus((prev) =>
                                        mergePreservingCompleted(prev, statusList)
                                    );
                                },
                                (payload) => {
                                    setSupportNotifyPayload(payload);
                                    setShowExecutiveConnectDialog(true);
                                }
                            );
                        }
                        addTranscriptMessage(combinedFinal, role);
                    }

                    if (!isFirstPersonaMessage) {
                        setLiveTranscript((prev) => {
                            const next = { ...prev };
                            if (combinedFinal) {
                                next[key] = "";
                            } else if (interimTexts.length > 0) {
                                next[key] = interimTexts.join(" ").trim();
                            }
                            return next;
                        });
                    }
                }
            );

            room.on(RoomEvent.Disconnected, () => {
                stopConversation();
            });

            const streamUrl = data?.stream_url ?? data?.video_url ?? data?.embed_url;
            if (!useLiveKitVisualizer && typeof streamUrl === "string") {
                const applyStreamUrlFallback = () => {
                    const el = videoRef.current;
                    if (!el || remoteVideoTrackRef.current) return;
                    el.srcObject = null;
                    el.src = streamUrl;
                    el.muted = true;
                    el.playsInline = true;
                    const onReady = () => setAvatarVideoActive(true);
                    el.addEventListener("loadeddata", onReady, { once: true });
                    void el.play().catch(() => {});
                };
                applyStreamUrlFallback();
            }
        } catch (error) {
            console.error("Failed to start conversation:", error);
            updateStatus(
                "connectionFailed",
                "error",
                error instanceof Error ? error.message : undefined
            );
            roomRef.current = null;
            localMicRef.current = null;
        }
    }, [updateStatus, stopConversation, addTranscriptMessage, assessmentId, isMuted, disableStartAfterFirstClick, locale]);

    const toggleMute = useCallback(() => {
        setIsMuted((prev) => {
            const next = !prev;
            const mic = localMicRef.current;
            if (mic) {
                if (next) {
                    mic.mute();
                } else {
                    mic.unmute();
                }
            }
            return next;
        });
    }, []);

    useEffect(() => {
        return () => {
            const remoteVideo = remoteVideoTrackRef.current;
            const v = videoRef.current;
            if (remoteVideo && v) {
                try {
                    remoteVideo.detach(v);
                } catch {
                    // ignore
                }
            }
            remoteVideoTrackRef.current = null;
            if (v) {
                v.pause();
                v.removeAttribute("src");
                v.src = "";
                v.srcObject = null;
            }
            const room = roomRef.current;
            if (room) {
                roomRef.current = null;
                try {
                    room.disconnect();
                } catch (err) {
                    // ignore on cleanup
                }
            }
            const mic = localMicRef.current;
            if (mic) {
                localMicRef.current = null;
                try {
                    mic.stop();
                } catch (err) {
                    // ignore on cleanup
                }
            }
        };
    }, []);

    const panelBg = "bg-[#0f172a]/40 backdrop-blur-2xl border-white/10";
    const panelShadow = "shadow-[0_20px_50px_rgba(0,0,0,0.3)]";
    const agentVisualizerState = useMemo(
        () => deriveAgentVisualizerState(isConnected, status.type, liveTranscript),
        [isConnected, status.type, liveTranscript]
    );
    const visualizerActive = useLiveKitVisualizer && remoteAgentAudioTrack != null;
    const isWaitingForAvatar = useLiveKitVisualizer
        ? !visualizerActive && (status.type === "loading" || isConnected)
        : !avatarVideoActive && (status.type === "loading" || isConnected);

    const statusMessage =
        status.customMessage ?? t(`aiQuestionnaire.assistant.status.${status.key}`);

    const mobileConnectionLabel = isConnected
        ? t("aiQuestionnaire.assistant.mobile.connected")
        : status.type === "loading"
          ? t("aiQuestionnaire.assistant.status.connecting")
          : t("aiQuestionnaire.assistant.mobile.notConnected");

    const mobileAssistantCaptionFull = useMemo(() => {
        const live = liveTranscript.persona.trim();
        if (live) return live;
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (msg.role !== "persona") continue;
            const content = msg.content?.trim();
            if (content) return content;
        }
        return "";
    }, [liveTranscript.persona, messages]);

    const mobileAssistantCaptionDisplay = useMemo(() => {
        const full =
            mobileAssistantCaptionFull ||
            t("aiQuestionnaire.assistant.mobile.listeningPrompt");
        return clampTextToLines(full);
    }, [mobileAssistantCaptionFull, t]);

    const mobileControls = (
        <div className="md:hidden shrink-0 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2.5 border-t border-white/10">
            <div className="flex justify-center">
                <button
                    type="button"
                    onClick={toggleMute}
                    disabled={!isConnected || isEnding}
                    aria-label={
                        isMuted
                            ? t("aiQuestionnaire.assistant.unmute")
                            : t("aiQuestionnaire.assistant.mute")
                    }
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white shadow-lg cursor-pointer disabled:opacity-50 hover:bg-white/15 transition-colors"
                >
                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </button>
            </div>
            <div className="w-full">
                {!isConnected ? (
                    <GradientButton
                        onClick={startConversation}
                        disabled={
                            isConnected ||
                            isEnding ||
                            (disableStartAfterFirstClick && hasClickedStartOnce)
                        }
                        loading={status.type === "loading"}
                        className="cursor-pointer"
                    >
                        {t("aiQuestionnaire.assistant.startConversation")}
                    </GradientButton>
                ) : (
                    <button
                        type="button"
                        onClick={endConversation}
                        disabled={isEnding || isDisable}
                        className={`w-full py-3 rounded-lg font-semibold text-white transition shadow-md flex items-center justify-center gap-2 text-sm ${
                            isEnding || isDisable
                                ? "bg-red-400 cursor-not-allowed opacity-70"
                                : "bg-red-500 hover:bg-red-600 cursor-pointer"
                        }`}
                    >
                        {isEnding
                            ? t("aiQuestionnaire.assistant.savingProgress")
                            : t("aiQuestionnaire.assistant.endConversation")}
                    </button>
                )}
            </div>
            <div
                className="flex justify-end"
                role="group"
                aria-label={t("aiQuestionnaire.assistant.mobile.viewMode")}
            >
                <div className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/10 p-1">
                    <button
                        type="button"
                        onClick={() => setMobileView("video")}
                        aria-pressed={mobileView === "video"}
                        aria-label={t("aiQuestionnaire.assistant.mobile.viewVideo")}
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors cursor-pointer ${
                            mobileView === "video"
                                ? "bg-white/15 text-white"
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        <Video className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileView("chat")}
                        aria-pressed={mobileView === "chat"}
                        aria-label={t("aiQuestionnaire.assistant.mobile.viewChat")}
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors cursor-pointer ${
                            mobileView === "chat"
                                ? "bg-white/15 text-white"
                                : "text-slate-400 hover:text-white"
                        }`}
                    >
                        <MessageSquare className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );

    const handleExecutiveConnectYes = useCallback(async () => {
        if (!supportNotifyPayload || isNotifyingSupport) return;
        setIsNotifyingSupport(true);
        try {
            await notifySupport(supportNotifyPayload);
            setShowExecutiveConnectDialog(false);
            setSupportNotifyPayload(null);
            updateStatus("supportNotified", "connected");
        } catch (err) {
            console.error("Notify support error:", err);
            updateStatus(
                "supportFailed",
                "error",
                err instanceof Error ? err.message : undefined
            );
        } finally {
            setIsNotifyingSupport(false);
        }
    }, [supportNotifyPayload, isNotifyingSupport, updateStatus]);
 
    const handleExecutiveConnectNo = useCallback(async () => {
        setShowExecutiveConnectDialog(false);
        setSupportNotifyPayload(null);
        try {
            await ApiCall({
                url: apiRoutes.user.aiQuestionnaireState,
                method: "POST",
                body: { assessmentId, resume_allowed: false },
            });
        } catch (err) {
            console.error("Failed to block assessment resume:", err);
        }
        void endConversation();
    }, [endConversation, assessmentId]);

    return (
        <>
            <Modal
                open={showExecutiveConnectDialog}
                onClose={handleExecutiveConnectNo}
                className="max-w-md"
            >
                <div className="p-6">
                    <p className="text-base font-semibold text-gray-900 mb-6">
                        {t("aiQuestionnaire.assistant.executiveDialogTitle")}
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleExecutiveConnectNo}
                            disabled={isNotifyingSupport}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {t("common.no")}
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleExecutiveConnectYes()}
                            disabled={isNotifyingSupport || !supportNotifyPayload}
                            className="px-4 py-2 rounded-lg bg-linear-to-r from-[#2D6CD5] to-[#F17E26] text-white font-semibold text-sm tracking-wide shadow-[inset_0_1px_0_rgba(0,0,0,0.1)] hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
                        >
                            {isNotifyingSupport ? t("aiQuestionnaire.assistant.connecting") : t("common.yes")}
                        </button>
                    </div>
                </div>
            </Modal>
            <div className="flex h-full min-h-0 flex-col overflow-hidden md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:h-auto md:overflow-visible">
            {/* Avatar / Lipsync panel */}
            <div
                className={`rounded-xl border flex flex-col min-w-0 min-h-0 flex-1 overflow-hidden p-0 md:p-6 md:flex-none ${panelBg} ${panelShadow} ${
                    mobileView === "chat" ? "hidden md:flex" : "flex"
                }`}
            >
                <div className={`flex flex-1 min-h-0 flex-col items-center max-md:justify-start justify-center relative overflow-hidden md:min-h-75 md:aspect-video md:rounded-lg ${useLiveKitVisualizer ? "md:bg-transparent" : "md:bg-slate-900"}`}>
                    <div className="md:hidden shrink-0 z-10 mt-5 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
                        <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                                isConnected
                                    ? "bg-emerald-400"
                                    : status.type === "loading"
                                      ? "bg-amber-400 animate-pulse"
                                      : "bg-slate-400"
                            }`}
                            aria-hidden
                        />
                        <span className="text-xs font-medium text-white whitespace-nowrap">
                            {mobileConnectionLabel}
                        </span>
                    </div>
                    {/* Mobile: milestone ring + circular video; desktop: full rectangle */}
                    <div className="max-md:flex max-md:flex-1 max-md:min-h-0 max-md:w-full max-md:items-center max-md:justify-center max-md:relative">
                        <div className="max-md:relative max-md:flex max-md:items-center max-md:justify-center">
                        {hasStartedConversation && (
                            <CircularMilestoneProgress
                                conversationStatus={milestoneStatus ?? undefined}
                                className="hidden max-md:block absolute h-78 w-78 sm:h-102 sm:w-102 pointer-events-none"
                                aria-label={`${t("aiQuestionnaire.milestone.progress")}: ${getMilestoneCompletionPercent(milestoneStatus)}%`}
                            />
                        )}
                        <div
                            className={`relative z-1 shrink-0 overflow-hidden border border-white/20 shadow-[0_0_72px_rgba(99,102,241,0.4)]
                            h-72 w-72 sm:h-96 sm:w-96 rounded-full
                            md:absolute md:inset-0 md:h-full md:w-full md:rounded-lg md:border-white/10 md:shadow-none`}
                        >
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`absolute inset-0 z-1 h-full w-full object-cover object-center transition-opacity duration-300 max-md:scale-110 ${
                                useLiveKitVisualizer
                                    ? "hidden"
                                    : avatarVideoActive
                                      ? "opacity-100"
                                      : "opacity-0 pointer-events-none"
                            }`}
                        />
                        {useLiveKitVisualizer && visualizerActive && (
                            <AgentAudioVisualizerAura
                                size="lg"
                                state={agentVisualizerState}
                                audioTrack={remoteAgentAudioTrack}
                                color="#FFFFFF"
                                colorShift={0.05}
                                themeMode="dark"
                                className="absolute inset-0 z-1 h-full w-full bg-transparent"
                            />
                        )}
                        {((useLiveKitVisualizer && !visualizerActive) ||
                            (!useLiveKitVisualizer && !avatarVideoActive)) && (
                            <div className="absolute inset-0 z-0 flex items-center justify-center bg-slate-800/80 md:bg-slate-800/60 md:px-6">
                                {isWaitingForAvatar ? (
                                    <div className="flex flex-col items-center gap-3 px-4">
                                        <Spinner className="h-10 w-10 text-slate-300" />
                                        <p className="text-center text-sm sm:text-base md:text-sm font-medium text-slate-300">
                                            {t("aiQuestionnaire.assistant.avatarConnecting")}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-center text-sm sm:text-base md:text-sm font-medium text-slate-300 relative z-1 px-4 leading-snug">
                                        {t("aiQuestionnaire.assistant.avatarPlaceholder")}
                                    </p>
                                )}
                            </div>
                        )}
                        </div>
                        </div>
                    </div>

                    {isConnected && mobileView === "video" && (
                        <div className="md:hidden shrink-0 h-16.5 sm:h-19.5 flex items-start justify-center px-4 pt-2 pb-1 w-full max-w-md">
                            <p
                                className="text-center text-xs sm:text-sm leading-snug text-slate-300/90 line-clamp-4 overflow-hidden wrap-break-word w-full"
                                title={
                                    mobileAssistantCaptionFull.length >
                                    mobileAssistantCaptionDisplay.length
                                        ? mobileAssistantCaptionFull
                                        : undefined
                                }
                            >
                                {mobileAssistantCaptionDisplay}
                            </p>
                        </div>
                    )}
                </div>

                {mobileControls}

                <div className="hidden md:block mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className={`text-sm font-semibold ${statusColor(status.type)}`}>
                            {statusMessage}
                        </p>
                        <button
                            type="button"
                            onClick={toggleMute}
                            aria-label={isMuted ? t("aiQuestionnaire.assistant.unmute") : t("aiQuestionnaire.assistant.mute")}
                            className="rounded-full p-2.5 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all border border-white/10 cursor-pointer disabled:opacity-50"
                            disabled={!isConnected || isEnding}
                        >
                            {isMuted ? (
                                <MicOff className="h-5 w-5" />
                            ) : (
                                <Mic className="h-5 w-5" />
                            )}
                        </button>
                    </div>

                    <div className="flex gap-3">
                        {!isConnected ? (
                            <GradientButton
                                onClick={startConversation}
                                disabled={
                                    isConnected ||
                                    isEnding ||
                                    (disableStartAfterFirstClick && hasClickedStartOnce)
                                }
                                loading={status.type === "loading"}
                                className="cursor-pointer"
                            >
                                {t("aiQuestionnaire.assistant.startConversation")}
                            </GradientButton>
                        ) : (
                            <button
                                type="button"
                                onClick={endConversation}
                                disabled={isEnding || isDisable}
                                className={`w-full py-3 rounded-lg font-semibold text-white transition shadow-md flex items-center justify-center gap-2
                                    ${(isEnding || isDisable)
                                        ? "bg-red-400 cursor-not-allowed opacity-70"
                                        : "bg-red-500 hover:bg-red-600 cursor-pointer"}
    `}
                            >
                                {isEnding ? t("aiQuestionnaire.assistant.savingProgress") : t("aiQuestionnaire.assistant.endConversation")}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat panel - Live Conversation (transcripts) */}
            <div
                className={`rounded-xl border p-3 md:p-6 ${panelBg} ${panelShadow} flex flex-col min-w-0 min-h-0 flex-1 overflow-hidden md:h-125 ${
                    mobileView === "video" ? "hidden md:flex" : "flex"
                }`}
            >
                <h2 className="hidden md:block text-base font-bold text-white/90 shrink-0">
                    {t("aiQuestionnaire.assistant.liveConversation")}
                </h2>
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide rounded-lg border border-white/5 bg-slate-900/40 p-3 md:p-4 space-y-4 mt-0 md:mt-4">
                    {messages.length === 0 && !liveTranscript.user && !liveTranscript.persona ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                <Mic className="w-6 h-6" />
                            </div>
                            <p className="text-sm text-gray-400 italic">
                                {t("aiQuestionnaire.assistant.transcriptsEmpty")}
                            </p>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => {
                                const isUser = msg.role === "user";
                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${isUser
                                                ? "bg-blue-600 text-white rounded-br-none"
                                                : "bg-[#1e293b]/80 border border-white/10 text-gray-100 rounded-bl-none shadow-sm"
                                                }`}
                                        >
                                            <p className="font-bold mb-0.5 text-[10px] uppercase tracking-wider opacity-70">
                                                {isUser ? t("aiQuestionnaire.assistant.you") : t("aiQuestionnaire.assistant.alice")}
                                            </p>
                                            <p className="leading-relaxed">{msg.content}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Real-time interim text as voice is being spoken */}
                            {(liveTranscript.user || liveTranscript.persona) && (
                                <div className="space-y-2 pt-1">
                                    {liveTranscript.persona && (
                                        <div className="flex justify-start">
                                            <div className="max-w-[85%] rounded-2xl px-4 py-2 text-sm bg-[#1e293b]/60 border border-amber-500/30 text-gray-200 rounded-bl-none border-dashed">
                                                <p className="font-bold mb-0.5 text-[10px] uppercase tracking-wider text-amber-400/90">
                                                    {t("aiQuestionnaire.assistant.aliceSpeaking")}
                                                </p>
                                                <p className="leading-relaxed flex items-center gap-1">
                                                    {liveTranscript.persona}
                                                    <span className="inline-block w-2 h-4 bg-amber-400/90 rounded-sm animate-pulse" aria-hidden />
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {liveTranscript.user && (
                                        <div className="flex justify-end">
                                            <div className="max-w-[85%] rounded-2xl px-4 py-2 text-sm bg-blue-600/60 border border-blue-400/30 text-white rounded-br-none border-dashed">
                                                <p className="font-bold mb-0.5 text-[10px] uppercase tracking-wider opacity-80">
                                                    {t("aiQuestionnaire.assistant.youSpeaking")}
                                                </p>
                                                <p className="leading-relaxed flex items-center gap-1">
                                                    {liveTranscript.user}
                                                    <span className="inline-block w-2 h-4 bg-white/90 rounded-sm animate-pulse" aria-hidden />
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {mobileControls}
            </div>

            {/* Milestone (scrollable, height matches conversation panel, same width as other sections) */}
            <aside className="hidden md:flex flex-col h-125 min-w-0 md:col-span-2 lg:col-span-1">
                <Milestone
                    isStarted={hasStartedConversation}
                    loadingIndex={
                        hasStartedConversation && status.type === "loading" && !milestoneStatus ? 0 : -1
                    }
                    conversationStatus={milestoneStatus ?? undefined}
                    isAssistantSpeaking={!!liveTranscript.persona}
                />
            </aside>
        </div>
        </>
    );
} 
