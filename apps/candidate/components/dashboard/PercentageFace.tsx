"use client";

export interface PercentageFaceProps {
    /** Percentage 0–100: low = frown, mid = neutral, high = smile */
    percentage: number;
    /** Tailwind class for stroke/fill (e.g. text-amber-500). Ignored when color is set. */
    className?: string;
    /** Hex or CSS color for stroke/fill. Takes precedence over className. */
    color?: string;
    /** Size in pixels (height). Default 20. */
    size?: number;
    /** Width in pixels. If set, emoji is wider than tall; otherwise same as size. */
    width?: number;
    /** Optional aria label */
    "aria-label"?: string;
}

/**
 * Simple face icon: circle, two eyes, and a mouth that curves based on percentage.
 * 0% = frown, ~50% = straight, 100% = smile.
 */
export function PercentageFace({
    percentage,
    className = "stroke-amber-500",
    color,
    size = 20,
    width: widthProp,
    "aria-label": ariaLabel,
}: PercentageFaceProps) {
    const width = widthProp ?? size;
    const pct = Math.max(0, Math.min(100, percentage));
    const viewBox = 24;
    const strokeWidth = 2.6;
    const r = (viewBox / 2) - strokeWidth;
    const cx = viewBox / 2;
    const cy = viewBox / 2;

    // Eyes: two small circles (pulled inward for more inner spacing)
    const eyeY = 9.5;
    const eyeOffset = 4;
    const eyeR = 1.2;

    // Mouth: shorter and slightly higher for more inner spacing from circle
    const mouthY = 14.5;
    const mouthLeft = 8;
    const mouthRight = 16;
    const controlY = mouthY + (pct - 50) / 12.5;

    return (
        <svg
            width={width}
            height={size}
            viewBox={`0 0 ${viewBox} ${viewBox}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={color ? undefined : className}
            style={color ? { color } : undefined}
            aria-hidden={!ariaLabel}
            aria-label={ariaLabel}
        >
            {/* Face circle */}
            <circle cx={cx} cy={cy} r={r} />
            {/* Eyes */}
            <circle cx={cx - eyeOffset} cy={eyeY} r={eyeR} fill="currentColor" />
            <circle cx={cx + eyeOffset} cy={eyeY} r={eyeR} fill="currentColor" />
            {/* Mouth: single path with quadratic curve */}
            <path
                d={`M ${mouthLeft} ${mouthY} Q ${cx} ${controlY} ${mouthRight} ${mouthY}`}
            />
        </svg>
    );
}
