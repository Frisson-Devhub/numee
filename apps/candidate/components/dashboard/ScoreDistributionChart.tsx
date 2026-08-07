"use client";

const DEFAULT_COMPETENCIES = [
    { name: "Communication", value: 70, color: "#2FA78F" },
    { name: "Problem Solving", value: 20, color: "#5893F5" },
    { name: "Technical knowledge", value: 10, color: "#FAAD14" },
];

const LEFT_LABEL_X = -7
const LIST_LABEL_Y = [180, 194, 208]; // vertical list at left bottom
const LABEL_FONT_SIZE = 13;
const LABEL_MAX_LENGTH = 35;

function truncateLabel(name: string): string {
    if (name.length <= LABEL_MAX_LENGTH) return name;
    return name.slice(0, LABEL_MAX_LENGTH).trimEnd() + "...";
}
const LAYOUT = [
    { cx: 85, cy: 95, r: 72, label: { x: LEFT_LABEL_X, y: LIST_LABEL_Y[0], textAnchor: "start" as const }, labelColor: "#5a727a", fontSize: 34 },
    { cx: 155, cy: 58, r: 48, label: { x: LEFT_LABEL_X, y: LIST_LABEL_Y[1], textAnchor: "start" as const }, labelColor: "#5a727a", fontSize: 26 },
    { cx: 175, cy: 128, r: 38, label: { x: LEFT_LABEL_X, y: LIST_LABEL_Y[2], textAnchor: "start" as const }, labelColor: "#5a727a", fontSize: 22 },
];

export interface ScoreDistributionItem {
    name: string;
    value: number;
}

interface ScoreDistributionChartProps {
    competencies?: ScoreDistributionItem[] | null;
}

/** Bubble chart of top-3 competency share; placeholder bubbles when data is invalid. */
export function ScoreDistributionChart({ competencies: propCompetencies }: ScoreDistributionChartProps) {
    const competencies =
        propCompetencies?.length &&
            propCompetencies.slice(0, 3).every((c) => typeof c.value === "number" && c.name != null)
            ? propCompetencies.slice(0, 3).map((c, i) => ({
                ...c,
                color: DEFAULT_COMPETENCIES[i]?.color ?? "#22c55e",
            }))
            : DEFAULT_COMPETENCIES;

    const items = competencies.map((c, i) => ({ ...c, layout: LAYOUT[i] ?? LAYOUT[0] }));

    return (
        <div className="h-55 w-full flex items-center justify-center overflow-visible min-w-0">
            <svg
                viewBox="0 0 240 200"
                className="w-full h-full max-w-70 overflow-visible"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    {/* Circle 0: hide where it overlaps circle 1 or 2 (overlap area of circle 0 not visible) */}
                    <mask id="score-mask-0">
                        <circle cx={LAYOUT[0].cx} cy={LAYOUT[0].cy} r={LAYOUT[0].r} fill="white" />
                        <circle cx={LAYOUT[1].cx} cy={LAYOUT[1].cy} r={LAYOUT[1].r} fill="black" />
                        <circle cx={LAYOUT[2].cx} cy={LAYOUT[2].cy} r={LAYOUT[2].r} fill="black" />
                    </mask>
                    {/* Circle 1: hide where it overlaps circle 2 */}
                    <mask id="score-mask-1">
                        <circle cx={LAYOUT[1].cx} cy={LAYOUT[1].cy} r={LAYOUT[1].r} fill="white" />
                        <circle cx={LAYOUT[2].cx} cy={LAYOUT[2].cy} r={LAYOUT[2].r} fill="black" />
                    </mask>
                </defs>
                {/* Draw 0 → 1 → 2; circle 0 overlap hidden, circle 1 overlap with 2 hidden, circle 2 full */}
                {items.map((c, i) => (
                    <circle
                        key={i}
                        cx={c.layout.cx}
                        cy={c.layout.cy}
                        r={c.layout.r}
                        fill={c.color}
                        fillOpacity={0.92}
                        stroke="white"
                        strokeWidth={i === 2 ? 3 : 4}
                        mask={i === 0 ? "url(#score-mask-0)" : i === 1 ? "url(#score-mask-1)" : undefined}
                    />
                ))}
                {items.map((c, i) => {
                    const label = c.layout.label;
                    return (
                        <g key={i}>
                            <circle cx={LEFT_LABEL_X - 6} cy={label.y - 4} r={4} fill={c.color} />
                            <text
                                x={label.x}
                                y={label.y}
                                textAnchor={label.textAnchor}
                                fill={c.layout.labelColor}
                                fontSize={LABEL_FONT_SIZE}
                                fontWeight={500}
                            >
                                {truncateLabel(c.name)}
                            </text>
                            <text
                                x={c.layout.cx}
                                y={c.layout.cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="white"
                                fontSize={c.layout.fontSize}
                                fontWeight={600}
                            >
                                {c.value}%
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
