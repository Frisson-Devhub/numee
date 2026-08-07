"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Cell,
    LabelList,
} from "recharts";

const DEFAULT_DATA = [
    { name: "Learning and Development Specialist", filled: 70, empty: 30, lightColor: "#fef9c3", darkColor: "#ea580c" },
    { name: "Educational Consultant", filled: 70, empty: 30, lightColor: "#dbeafe", darkColor: "#2563eb" },
    { name: "Training Coordin", filled: 70, empty: 30, lightColor: "#ccfbf1", darkColor: "#0d9488" },
];

const JOB_COLORS = [
    { lightColor: "#EEDBB3", darkColor: "#FAAE16" },
    { lightColor: "#B1C4E4", darkColor: "#5893F5" },
    { lightColor: "#BDFFF2", darkColor: "#2FA78F" },
];

/** Dashboard job row; `match_score` is a 0–1 fraction (not cosine −1…1). */
export interface MatchScoreJob {
    job_role: string;
    match_score: number;
}

interface MatchScoreChartProps {
    jobs?: MatchScoreJob[] | null;
}

function wrapLabel(str: string, maxChars = 18) {
    if (str.length <= maxChars) return [str];
    const words = str.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
        if (current.length + w.length + 1 <= maxChars) {
            current += (current ? " " : "") + w;
        } else {
            if (current) lines.push(current);
            current = w;
        }
    }
    if (current) lines.push(current);
    return lines;
}

/**
 * Top-3 role match bars. `match_score` is a 0–1 fraction (×100 for display),
 * unlike `getMatchPresentation` which expects raw cosine similarity. Falls back
 * to placeholder data when unset.
 */
export function MatchScoreChart({ jobs: propJobs }: MatchScoreChartProps) {
    const data = propJobs?.length
        ? propJobs.slice(0, 3).map((j, i) => {
            const pct = Math.min(100, Math.max(0, Math.round((j.match_score ?? 0) * 100)));
            const colors = JOB_COLORS[i % JOB_COLORS.length];
            return {
                name: j.job_role,
                filled: pct,
                empty: 100 - pct,
                lightColor: colors.lightColor,
                darkColor: colors.darkColor,
            };
        })
        : DEFAULT_DATA;

    return (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:min-w-96">
            <h3 className="text-center text-sm font-semibold text-gray-800 mb-6  pb-2 border-b border-gray-100">
                Match Score Vs Suggested Jobs
            </h3>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 5, right: 0, left: 0, bottom: 20 }}
                        barGap={24}
                        barCategoryGap="1%"
                    >
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                            tick={(props) => {
                                const { x, y, payload } = props;
                                const lines = wrapLabel(payload.value);
                                return (
                                    <g transform={`translate(${x},${y})`}>
                                        {lines.map((line, i) => (
                                            <text
                                                key={i}
                                                x={0}
                                                y={8 + i * 14}
                                                textAnchor="middle"
                                                fill="#374151"
                                                fontSize={11}
                                            >
                                                {line}
                                            </text>
                                        ))}
                                    </g>
                                );
                            }}
                            dy={8}
                        />
                        <YAxis
                            type="number"
                            domain={[0, 100]}
                            hide
                            axisLine={false}
                            tickLine={false}
                        />
                        <Bar dataKey="filled" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={60}>
                            <LabelList
                                position="top"
                                formatter={(value: unknown) => `${value}%`}
                                style={{ fill: "#31A890", fontSize: 12, fontWeight: 500 }}
                            />
                            {data.map((entry, index) => (
                                <Cell key={`filled-${index}`} fill={entry.darkColor} />
                            ))}
                        </Bar>
                        <Bar dataKey="empty" stackId="a" radius={[6, 6, 0, 0]} maxBarSize={60}>
                            {data.map((entry, index) => (
                                <Cell key={`empty-${index}`} fill={entry.lightColor} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
