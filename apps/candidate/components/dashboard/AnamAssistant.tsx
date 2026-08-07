"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff } from "lucide-react";
import { createClient, AnamEvent, MessageRole } from "@anam-ai/js-sdk";
import type { AnamClient, Message } from "@anam-ai/js-sdk";
import { GradientButton } from "../ui/GradientButton";
import { apiRoutes } from "@/constants/api";
import { ApiCall } from "@/lib/utils";

const VIDEO_ELEMENT_ID = "persona-video";

type StatusType = "normal" | "loading" | "connected" | "error";

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

/** Derive question/answer pairs: each AI message is a question, the next user message is the answer */
function getQuestionAnswerPairs(messages: Message[]): { question: string; answer: string }[] {
    const pairs: { question: string; answer: string }[] = [];
    for (let i = 0; i < messages.length - 1; i++) {
        if (messages[i].role === "persona" && messages[i + 1].role === "user") {
            pairs.push({
                question: messages[i].content?.trim() ?? "",
                answer: messages[i + 1].content?.trim() ?? "",
            });
        }
    }
    return pairs;
}

async function saveQuestionAnswerPairs(pairs: { question: string; answer: string }[]) {
    if (pairs.length === 0) return;
    try {
        const res = await ApiCall({
            url: apiRoutes.anam.saveMessages,
            method: "POST",
            body: { questionAnswerPairs: pairs },
        });
        if (!res.ok) {
            console.error("Failed to save assistant Q&A:", res.error ?? res.data);
        }
    } catch (err) {
        console.error("Save assistant Q&A error:", err);
    }
}

async function handleUserMessage(
    anamClient: AnamClient | null,
    messageHistory: Message[],
    onPersonaResponse: (content: string) => void
) {
    if (
        !anamClient ||
        messageHistory.length === 0 ||
        messageHistory[messageHistory.length - 1].role !== "user"
    ) {
        return;
    }

    try {
        const openAIMessages = messageHistory.map((msg) => ({
            role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
            content: msg.content,
        }));

        const talkStream = anamClient.createTalkMessageStream();

        const response = await fetch("/api/anam/chat-stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: openAIMessages }),
        });

        if (!response.ok) {
            throw new Error(`LLM request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error("Failed to get response stream reader");
        }

        const textDecoder = new TextDecoder();
        let fullContent = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                if (talkStream.isActive()) {
                    talkStream.endMessage();
                }
                if (fullContent.trim()) {
                    onPersonaResponse(fullContent.trim());
                }
                break;
            }
            if (value) {
                const text = textDecoder.decode(value);
                const lines = text.split("\n").filter((line) => line.trim());
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line) as { content?: string };
                        if (data.content && talkStream.isActive()) {
                            fullContent += data.content;
                            talkStream.streamMessageChunk(data.content, false);
                        }
                    } catch {
                        // ignore parse errors in streaming
                    }
                }
            }
        }
    } catch (error) {
        console.error("Custom LLM error:", error);
        if (anamClient) {
            const fallback = "I'm sorry, I encountered an error while processing your request. Please try again.";
            anamClient.talk(fallback);
            onPersonaResponse(fallback);
        }
    }
}

/**
 * Anam SDK persona session: streams LLM replies into lip-sync talk streams,
 * persists Q&A on end, then navigates to the dashboard.
 */
export function AnamAssistant() {
    const router = useRouter();
    const [status, setStatus] = useState<{ message: string; type: StatusType }>({
        message: "Ready to connect",
        type: "normal",
    });
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isEnding, setIsEnding] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const clientRef = useRef<AnamClient | null>(null);
    const messagesRef = useRef<Message[]>([]);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const hasEndedRef = useRef(false);
    const isMutedRef = useRef(false);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const updateStatus = useCallback((message: string, type: StatusType = "normal") => {
        setStatus({ message, type });
    }, []);

    const stopConversation = useCallback(() => {
        const client = clientRef.current;
        if (!client) return;

        // Clear reference FIRST to prevent recursion if stopStreaming
        // triggers CONNECTION_CLOSED synchronously
        clientRef.current = null;
        try {
            client.stopStreaming();
        } catch (err) {
            console.error("Error stopping Anam stream:", err);
        }

        setMessages([]);
        setIsConnected(false);
        setIsEnding(false);
        updateStatus("Disconnected", "normal");
    }, [updateStatus]);

    const endConversation = useCallback(async () => {
        if (hasEndedRef.current) return;
        const client = clientRef.current;
        if (!client) return;
        hasEndedRef.current = true;
        setIsEnding(true);
        const currentMessages = messagesRef.current;
        const pairs = getQuestionAnswerPairs(currentMessages);
        if (pairs.length > 0) {
            try {
                await saveQuestionAnswerPairs(pairs);
            } catch (err) {
                console.error("Failed to save conversation:", err);
            }
        }
        stopConversation();
        router.push("/user/dashboard");
    }, [stopConversation, router]);

    const startConversation = useCallback(async () => {
        hasEndedRef.current = false;
        try {
            updateStatus("Connecting...", "loading");
            setIsConnected(false);

            const response = await ApiCall<{ sessionToken?: string; error?: string }>({
                url: apiRoutes.anam.sessionToken,
                method: "POST",
            });

            if (!response.ok) {
                throw new Error(response.data?.error ?? response.error ?? "Failed to get session token");
            }

            const sessionToken = response.data?.sessionToken;
            if (!sessionToken) {
                throw new Error("Invalid token response: missing sessionToken");
            }
            const anamClient = createClient(sessionToken);
            clientRef.current = anamClient;

            anamClient.addListener(AnamEvent.SESSION_READY, () => {
                updateStatus("Connected — Secure session established.", "connected");
                setIsConnected(true);
                if (isMutedRef.current) {
                    anamClient.muteInputAudio();
                }
                const greeting = "Hello! I'm Numi, your AI assistant. How can I help you today?";
                anamClient.talk(greeting);
                setMessages((prev) => [
                    ...prev,
                    { id: `persona-${Date.now()}`, content: greeting, role: MessageRole.PERSONA },
                ]);
            });

            anamClient.addListener(AnamEvent.CONNECTION_CLOSED, () => {
                stopConversation();
            });

            anamClient.addListener(
                AnamEvent.MESSAGE_HISTORY_UPDATED,
                (messageHistory: Message[]) => {
                    handleUserMessage(anamClient, messageHistory, (personaContent) => {
                        setMessages((prev) => [
                            ...prev,
                            {
                                id: `persona-${Date.now()}`,
                                content: personaContent,
                                role: MessageRole.PERSONA,
                            },
                        ]);
                    });
                }
            );

            anamClient.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, (msgs: Message[]) => {
                // Merge SDK history with current display; skip any message we already have (by id or by role+content)
                setMessages((prev) => {
                    const merged = [...prev];
                    const prevIds = new Set(prev.map((m) => m.id));
                    const seenRoleContent = new Set(prev.map((m) => `${m.role}::${(m.content ?? "").trim()}`));
                    for (const m of msgs) {
                        if (prevIds.has(m.id)) continue;
                        const key = `${m.role}::${(m.content ?? "").trim()}`;
                        if (seenRoleContent.has(key)) continue;
                        merged.push(m);
                        prevIds.add(m.id);
                        seenRoleContent.add(key);
                    }
                    return merged;
                });
            });

            anamClient.addListener(AnamEvent.TALK_STREAM_INTERRUPTED, () => {
                // optional: could show a toast
            });

            await anamClient.streamToVideoElement(VIDEO_ELEMENT_ID);
        } catch (error) {
            console.error("Failed to start conversation:", error);
            updateStatus(
                error instanceof Error ? error.message : "Connection failed",
                "error"
            );
            clientRef.current = null;
        }
    }, [updateStatus, stopConversation]);

    useEffect(() => {
        return () => {
            const client = clientRef.current;
            if (client) {
                clientRef.current = null;
                try {
                    client.stopStreaming();
                } catch (err) {
                    // Silently fail on cleanup
                }
            }
        };
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted((prev) => {
            const next = !prev;
            const client = clientRef.current;
            if (client) {
                if (next) {
                    client.muteInputAudio();
                } else {
                    client.unmuteInputAudio();
                }
            }
            return next;
        });
    }, []);

    const panelBg = "bg-[#0f172a]/40 backdrop-blur-2xl border-white/10";
    const panelShadow = "shadow-[0_20px_50px_rgba(0,0,0,0.3)]";

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Persona panel */}
            <div className={`rounded-xl border p-6 ${panelBg} ${panelShadow} flex flex-col`}>
                <div className="flex-1 flex items-center justify-center min-h-75">
                    <video
                        id={VIDEO_ELEMENT_ID}
                        autoPlay
                        playsInline
                        className="w-full max-w-100 rounded-lg bg-slate-900 aspect-video object-cover"
                    />
                </div>

                <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className={`text-sm font-semibold ${statusColor(status.type)}`}>
                            {status.message}
                        </p>
                        <button
                            type="button"
                            onClick={toggleMute}
                            aria-label={isMuted ? "Unmute" : "Mute"}
                            className="rounded-full p-2.5 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all border border-white/10 cursor-pointer"
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
                                disabled={isConnected || isEnding}
                                loading={status.type === "loading"}
                                className="cursor-pointer"
                            >
                                Start Conversation
                            </GradientButton>
                        ) : (
                            <button
                                type="button"
                                onClick={endConversation}
                                disabled={isEnding}
                                className="w-full py-3 rounded-lg font-semibold text-white bg-red-500 hover:bg-red-600 transition shadow-md disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {isEnding ? "Saving progress..." : "End conversation"}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat panel */}
            <div className={`rounded-xl border p-6 ${panelBg} ${panelShadow} flex flex-col h-125`}>
                <h2 className="text-base font-bold text-white/90">Live Conversation</h2>
                <div className="mt-4 flex-1 overflow-y-auto scrollbar-hide rounded-lg border border-white/5 bg-slate-900/40 p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                <Mic className="w-6 h-6" />
                            </div>
                            <p className="text-sm text-gray-400 italic">
                                Start the conversation to see history...
                            </p>
                        </div>
                    ) : (
                        messages.map((msg, i) => {
                            const isUser = msg.role === "user";
                            return (
                                <div
                                    key={i}
                                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${isUser
                                            ? "bg-blue-600 text-white rounded-br-none"
                                            : "bg-[#1e293b]/80 border border-white/10 text-gray-100 rounded-bl-none shadow-sm"
                                            }`}
                                    >
                                        <p className="font-bold mb-0.5 text-[10px] uppercase tracking-wider opacity-70">
                                            {isUser ? "You" : "Cara"}
                                        </p>
                                        <p className="leading-relaxed">{msg.content}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>
            </div>
        </div>
    );
}
