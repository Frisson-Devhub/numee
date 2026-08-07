"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

const data = [
    { name: "", resume: 60, test: 55, jd: 80 },
    { name: "", resume: 85, test: 70, jd: 90 },
    { name: "", resume: 65, test: 60, jd: 70 },
    { name: "", resume: 70, test: 80, jd: 75 },
    { name: "", resume: 75, test: 70, jd: 72 },
    { name: "", resume: 65, test: 60, jd: 68 },
];

/** Static resume / test / JD comparison bars until live comparison data exists. */
export function ComparisonChart() {
    return (
        <div className="h-[280px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 0,
                        left: -20,
                        bottom: 5,
                    }}
                    barGap={6}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={false} axisLine={false} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend
                        wrapperStyle={{ top: -30, right: 0, fontSize: '11px' }}
                        iconType="square"
                        iconSize={8}
                    />
                    <Bar dataKey="resume" name="Resume Skills" fill="#2dd4bf" barSize={8} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="test" name="Test Answers" fill="#60a5fa" barSize={8} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="jd" name="Job Description" fill="#34d399" barSize={8} radius={[2, 2, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
