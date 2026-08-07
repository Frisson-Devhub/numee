"use client";

import { useId } from "react";
import { getMilestoneCompletionPercent } from "@/lib/milestone-status";
import type { MilestoneStatusItem } from "@/interfaces/types";

type CircularMilestoneProgressProps = {
    conversationStatus?: MilestoneStatusItem[] | null;
    /** Tailwind size classes for the outer ring (e.g. h-54 w-54). */
    className?: string;
    strokeWidth?: number;
    "aria-label"?: string;
};

/** SVG ring of completed / total milestones from conversation status. */
export function CircularMilestoneProgress({
    conversationStatus,
    className = "h-54 w-54 sm:h-62 sm:w-62",
    strokeWidth = 4,
    "aria-label": ariaLabel = "Assessment milestone progress",
}: CircularMilestoneProgressProps) {
    const gradientId = useId();
    const percent = getMilestoneCompletionPercent(conversationStatus);
    const viewSize = 100;
    const radius = (viewSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
        <svg
            className={`shrink-0 -rotate-90 ${className}`}
            viewBox={`0 0 ${viewSize} ${viewSize}`}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={ariaLabel}
        >
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#2D6CD5" />
                    <stop offset="100%" stopColor="#F17E26" />
                </linearGradient>
            </defs>
            <circle
                cx={viewSize / 2}
                cy={viewSize / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={strokeWidth}
            />
            <circle
                cx={viewSize / 2}
                cy={viewSize / 2}
                r={radius}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-[stroke-dashoffset] duration-500 ease-out"
            />
        </svg>
    );
}