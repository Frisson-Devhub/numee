"use client";

/**
 * Circle loader: spinning stroke on a circle. Use for "in progress" milestone state.
 * Matches CompletedCircleTick size/stroke so you can swap between loader and completed.
 */
export function CircleLoader({
    size = 40,
    strokeWidth = 2,
    className,
}: {
    size?: number;
    strokeWidth?: number;
    className?: string;
}) {
    const r = (size - strokeWidth) / 2;
    const cx = size / 2;
    const circumference = 2 * Math.PI * r;
    const gap = circumference * 0.6;
    const dash = circumference - gap;

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className={className}
            aria-hidden
        >
            <defs>
                <style>{`
                    .circle-loader-track {
                        fill: none;
                        stroke: rgba(255,255,255,0.15);
                        stroke-width: ${strokeWidth};
                    }
                    .circle-loader-stroke {
                        fill: none;
                        stroke: rgba(255,255,255,0.6);
                        stroke-width: ${strokeWidth};
                        stroke-dasharray: ${dash} ${gap};
                        stroke-linecap: round;
                        transform-origin: ${cx}px ${cx}px;
                        animation: circle-loader-spin 0.8s linear infinite;
                    }
                    @keyframes circle-loader-spin {
                        from { transform: rotate(-90deg); }
                        to { transform: rotate(270deg); }
                    }
                `}</style>
            </defs>
            <circle className="circle-loader-track" cx={cx} cy={cx} r={r} />
            <circle
                className="circle-loader-stroke"
                cx={cx}
                cy={cx}
                r={r}
            />
        </svg>
    );
}

/** Build serrated badge path (star-like edge, ~24 points) */
function serratedBadgePath(cx: number, cy: number, outerR: number, teeth = 24) {
    const innerR = outerR * 0.88;
    const points: string[] = [];
    for (let i = 0; i < teeth; i++) {
        const a1 = (i * 2 * Math.PI) / teeth - Math.PI / 2;
        points.push(`${cx + outerR * Math.cos(a1)} ${cy + outerR * Math.sin(a1)}`);
        const a2 = ((i + 0.5) * 2 * Math.PI) / teeth - Math.PI / 2;
        points.push(`${cx + innerR * Math.cos(a2)} ${cy + innerR * Math.sin(a2)}`);
    }
    return `M ${points.join(" L ")} Z`;
}

/**
 * Completed badge: serrated green circle, white ring, white bold tick (matches seal/badge style).
 * Use for completed milestone / success state.
 */
export function CompletedCircleTick({
    size = 40,
    strokeWidth = 2,
    durationMs = 600,
    className,
}: {
    size?: number;
    strokeWidth?: number;
    durationMs?: number;
    className?: string;
}) {
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 1;
    const whiteRingR = outerR * 0.72;
    const whiteRingStroke = Math.max(2.5, size * 0.08);
    const tickPathLength = 23;

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className={className}
            aria-hidden
        >
            <defs>
                <style>{`
                    @keyframes completed-badge-in {
                        0% { opacity: 0; transform: scale(0.92); }
                        100% { opacity: 1; transform: scale(1); }
                    }
                    @keyframes completed-tick-show {
                        0% { opacity: 0; stroke-dashoffset: ${tickPathLength}; }
                        60% { opacity: 0; stroke-dashoffset: ${tickPathLength}; }
                        100% { opacity: 1; stroke-dashoffset: 0; }
                    }
                    .completed-badge-serrated {
                        fill: #22c55e;
                        animation: completed-badge-in ${durationMs}ms ease-out forwards;
                    }
                    .completed-badge-tick {
                        fill: none;
                        stroke: white;
                        stroke-width: 3.5;
                        stroke-linecap: round;
                        stroke-linejoin: round;
                        stroke-dasharray: ${tickPathLength};
                        stroke-dashoffset: ${tickPathLength};
                        opacity: 0;
                        animation: completed-tick-show 350ms ease-out ${durationMs + 50}ms forwards;
                    }
                `}</style>
            </defs>
            {/* Serrated green badge (outer shape) */}
            <path
                className="completed-badge-serrated"
                d={serratedBadgePath(cx, cy, outerR)}
            />
            {/* White circular ring inside */}
            <circle
                cx={cx}
                cy={cy}
                r={whiteRingR}
                fill="none"
                stroke="white"
                strokeWidth={whiteRingStroke}
            />
            {/* White bold tick, centered */}
            <path
                className="completed-badge-tick"
                d="M 8 10 L 10 15 L 21 6"
                transform={`translate(${cx},${cy}) scale(${size / 24}) translate(-12,-12)`}
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}
