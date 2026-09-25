"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    ASSESSMENT_HEARTBEAT_MS,
    ASSESSMENT_QUEUE_POLL_MS,
} from "@numee/shared/server";
import type { AssessmentSlotStatus } from "@/interfaces/types";
import { apiRoutes } from "@/constants/api";
import { ApiCall } from "@/lib/utils";

/**
 * Admission control for a live assessment.
 *
 * A session holds a LiveKit room and an agent worker for its whole duration, so only so
 * many can run at once. `claim` either returns a seat or puts the candidate in line;
 * while waiting it polls, and resolves as soon as a seat opens.
 *
 * Every endpoint is keyed by the signed-in user server-side, so a refresh mid-wait
 * rejoins at the same position rather than taking a second place in line.
 */
/**
 * Consecutive failed polls before the candidate is let through unmetered. Generous
 * enough to ride out a redeploy, short enough that nobody stares at a spinner for long.
 */
const MAX_POLL_FAILURES = 5;

export function useAssessmentQueue(assessmentId: string) {
    const [slot, setSlot] = useState<AssessmentSlotStatus | null>(null);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const abandonedRef = useRef(false);
    /** Settles the in-flight `waitForSlot` when the candidate leaves the queue. */
    const abandonWaitRef = useRef<(() => void) | null>(null);

    const stopPolling = useCallback(() => {
        if (pollTimerRef.current) {
            clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    }, []);

    const stopHeartbeat = useCallback(() => {
        if (heartbeatTimerRef.current) {
            clearInterval(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
        }
    }, []);

    /** Keep the seat alive for as long as the assessment is running. */
    const startHeartbeat = useCallback(() => {
        stopHeartbeat();
        heartbeatTimerRef.current = setInterval(() => {
            void ApiCall<AssessmentSlotStatus>({
                url: apiRoutes.assessmentQueue.heartbeat,
                method: "POST",
                body: { assessmentId },
            });
        }, ASSESSMENT_HEARTBEAT_MS);
    }, [assessmentId, stopHeartbeat]);

    /**
     * Hand the seat back. Best effort: the server-side TTL is what actually guarantees
     * release, because a closed laptop never reaches this.
     */
    const release = useCallback(() => {
        abandonedRef.current = true;
        stopPolling();
        stopHeartbeat();
        abandonWaitRef.current?.();
        abandonWaitRef.current = null;
        setSlot(null);
        void ApiCall({ url: apiRoutes.assessmentQueue.release, method: "POST" });
    }, [stopPolling, stopHeartbeat]);

    /**
     * Resolve once the candidate may proceed.
     *
     * Returns the slot when one is held, or `null` when admission control itself is
     * unavailable — a 503 while migrations are pending, a network blip, anything that
     * is not a real answer. Failing open is safe because this gate is only for UX: the
     * API enforces capacity again inside `get-token`, and it would be far worse to
     * block a candidate from their assessment because the waiting room is down.
     *
     * Rejects only with `queue-abandoned`, when the candidate leaves the queue.
     */
    const waitForSlot = useCallback(async (): Promise<AssessmentSlotStatus | null> => {
        abandonedRef.current = false;

        const query = `?assessmentId=${encodeURIComponent(assessmentId)}`;
        const request = (url: string, method: "GET" | "POST") =>
            ApiCall<AssessmentSlotStatus & { error?: string }>({
                url: method === "GET" ? `${url}${query}` : url,
                method,
                ...(method === "POST" ? { body: { assessmentId } } : {}),
            });

        const first = await request(apiRoutes.assessmentQueue.claim, "POST");
        if (!first.ok || !first.data?.state) {
            console.warn(
                "Assessment queue unavailable, continuing without it:",
                first.data?.error ?? first.error ?? first.status,
            );
            return null;
        }
        setSlot(first.data);
        if (first.data.state === "active") {
            startHeartbeat();
            return first.data;
        }

        return new Promise<AssessmentSlotStatus | null>((resolve, reject) => {
            // `release` settles this promise directly, so leaving the queue needs no
            // extra timer watching a flag.
            abandonWaitRef.current = () => reject(new Error("queue-abandoned"));

            let consecutiveFailures = 0;

            const poll = async () => {
                if (abandonedRef.current) return;
                const res = await request(apiRoutes.assessmentQueue.status, "GET");
                if (abandonedRef.current) return;

                if (!res.ok || !res.data?.state) {
                    consecutiveFailures += 1;
                    // A blip should not eject the candidate: their entry survives
                    // server-side until its TTL, so keep polling. But if the queue
                    // stays unreachable, let them through rather than leaving them
                    // watching a spinner that will never resolve.
                    if (consecutiveFailures >= MAX_POLL_FAILURES) {
                        console.warn(
                            "Assessment queue stopped responding, continuing without it",
                        );
                        stopPolling();
                        abandonWaitRef.current = null;
                        setSlot(null);
                        resolve(null);
                        return;
                    }
                    pollTimerRef.current = setTimeout(poll, ASSESSMENT_QUEUE_POLL_MS);
                    return;
                }

                consecutiveFailures = 0;
                setSlot(res.data);
                if (res.data.state === "active") {
                    stopPolling();
                    abandonWaitRef.current = null;
                    startHeartbeat();
                    resolve(res.data);
                    return;
                }
                pollTimerRef.current = setTimeout(poll, ASSESSMENT_QUEUE_POLL_MS);
            };

            pollTimerRef.current = setTimeout(poll, ASSESSMENT_QUEUE_POLL_MS);
        });
    }, [assessmentId, startHeartbeat, stopPolling]);

    /** Release on unmount and on tab close, so a seat is not held until its TTL. */
    useEffect(() => {
        const onUnload = () => {
            navigator.sendBeacon?.(apiRoutes.assessmentQueue.release);
        };
        window.addEventListener("pagehide", onUnload);
        return () => {
            window.removeEventListener("pagehide", onUnload);
            stopPolling();
            stopHeartbeat();
        };
    }, [stopPolling, stopHeartbeat]);

    return { slot, waitForSlot, release, isWaiting: slot?.state === "waiting" };
}
