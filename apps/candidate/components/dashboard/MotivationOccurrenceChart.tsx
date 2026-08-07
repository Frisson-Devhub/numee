"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AreaChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    ReferenceDot,
    ReferenceLine,
    Text,
    Tooltip,
} from "recharts";

const DEFAULT_LINE_DATA = [
    { name: "1", value: 1 },
    { name: "2", value: 2 },
    { name: "3", value: 3 },
    { name: "4", value: 2.2 },
    { name: "5", value: 1.5 },
];

const DEFAULT_PILLS = [
    { label: "Development", active: false },
    { label: "Purposes", active: true },
    { label: "Challenges", active: false },
];

export interface MotivationOccurrenceChartProps {
    times?: number;
    lineData?: Array<{ name: string; value: number }>;
    pills?: Array<{ label: string; active: boolean; times?: number }>;
}

interface TimesTooltipProps {
    active?: boolean;
    payload?: unknown[] | readonly unknown[];
    label?: string | number;
    selectedLabel: string;
    times: number;
}

function TimesTooltip({ active, payload, selectedLabel, times }: TimesTooltipProps) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
            <p className="text-xs font-medium text-gray-700">{selectedLabel}</p>
            <p className="text-sm font-semibold text-[#2FA78F]">
                {times} {times === 1 ? "time" : "times"}
            </p>
        </div>
    );
}

/**
 * Motivation theme chart: pill selection drives the highlighted occurrence count
 * and tooltip; defaults are placeholders when assessment data is absent.
 */
export function MotivationOccurrenceChart({
    times = 3,
    lineData = DEFAULT_LINE_DATA,
    pills = DEFAULT_PILLS,
}: MotivationOccurrenceChartProps) {
    const initialSelected = useMemo(
        () => Math.max(0, pills.findIndex((p) => p.active)),
        [pills]
    );
    const [selectedIndex, setSelectedIndex] = useState(initialSelected);

    useEffect(() => {
        const activeIdx = pills.findIndex((p) => p.active);
        if (activeIdx >= 0) setSelectedIndex(activeIdx);
    }, [pills]);

    const selectedPill = pills[selectedIndex];
    const displayTimes = selectedPill?.times ?? times;
    const selectedLabel = selectedPill?.label ?? "Selected";

    return (
        <div>
            <div className="h-35 w-full ">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lineData} margin={{ top: 16, right: 0, left: -60, bottom: -30 }}>
                        <defs>
                            <linearGradient
                                id="motivationOccurrenceGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#bbf7d0" stopOpacity={0.08} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={false} axisLine={false} padding={{ left: 8, right: 8 }} />
                        <YAxis axisLine={false} tickLine={false} tick={false} domain={[0, 4]} />
                        <Tooltip
                            content={(props) => (
                                <TimesTooltip
                                    {...props}
                                    selectedLabel={selectedLabel}
                                    times={displayTimes}
                                />
                            )}
                            cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            fill="url(#motivationOccurrenceGradient)"
                            stroke="none"
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#2FA78F"
                            strokeWidth={4}
                            dot={false}
                        />
                        {(() => {
                            const pointIdx = lineData.length
                                ? Math.min(selectedIndex, lineData.length - 1)
                                : 0;
                            const point = lineData[pointIdx];
                            if (!point) return null;
                            return (
                                <>
                                    <ReferenceDot
                                        x={point.name}
                                        y={point.value}
                                        r={7}
                                        fill="#2FA78F"
                                        stroke="#2FA78F"
                                        label={{
                                            value: `${displayTimes} ${displayTimes === 1 ? "time" : "times"}`,
                                            position: "top",
                                            fill: "#2FA78F",
                                            fontSize: 12,
                                            fontWeight: 600,
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            content: (props: any) => {
                                                const vb = (props.viewBox as { x?: number; y?: number; width?: number; height?: number } | undefined) ?? {};
                                                const cx = (vb.x ?? 0) + (vb.width ?? 14) / 2;
                                                const cy = vb.y ?? 0;
                                                const offsetX = selectedIndex === 0 ? 24 : selectedIndex === 2 ? -24 : 0;
                                                return (
                                                    <Text x={cx + offsetX} y={cy - 8} textAnchor="middle" verticalAnchor="end" fill="#2FA78F" fontSize={18} fontWeight={600}>
                                                        {props.value as string | number}
                                                    </Text>
                                                );
                                            },
                                        }}
                                    />
                                    <ReferenceLine
                                        segment={[{ x: point.name, y: 0 }, { x: point.name, y: point.value }]}
                                        stroke="#2FA78F"
                                        strokeWidth={2}
                                        strokeDasharray="none"
                                    />
                                </>
                            );
                        })()}
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Pills: clickable, selection drives chart metric and tooltip */}
            <div className="flex justify-between items-center mt-3 gap-2">
                {pills.map((pill, i) => (
                    <button
                        key={pill.label}
                        type="button"
                        onClick={() => setSelectedIndex(i)}
                        className={`flex-1 text-xs px-3 py-1.5 min-w-6 rounded-full whitespace-nowrap truncate text-center transition-colors ${i === selectedIndex
                            ? "bg-[#2FA78F] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                    >
                        {pill.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
