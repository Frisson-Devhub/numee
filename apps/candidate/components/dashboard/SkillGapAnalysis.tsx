"use client";

const skillGaps = [
    { name: "Frontend Development", current: 60, target: 90, gap: 30 },
    { name: "Backend Development", current: 45, target: 85, gap: 40 },
    { name: "UI/UX Design", current: 70, target: 80, gap: 10 },
    { name: "Project Management", current: 70, target: 80, gap: 10 },
];

/** Static skill-gap demo until live gap analysis is wired. */
export function SkillGapAnalysis() {
    return (
        <div>
            <div className="grid grid-cols-3 text-center mb-8 bg-[#f0fdf4] py-4 rounded-lg border border-green-100">
                <div>
                    <div className="text-xl font-bold text-gray-900">54</div>
                    <div className="text-[10px] text-gray-500 font-medium">Average Current</div>
                </div>
                <div>
                    <div className="text-xl font-bold text-gray-900">80</div>
                    <div className="text-[10px] text-gray-500 font-medium">Average Target</div>
                </div>
                <div>
                    <div className="text-xl font-bold text-red-500">26</div>
                    <div className="text-[10px] text-red-500 font-medium">Average Gap</div>
                </div>
            </div>

            <div className="space-y-6">
                {skillGaps.map((skill, idx) => (
                    <div key={idx} className="flex items-start justify-between">
                        <div className="flex-1 pr-4">
                            <h4 className="text-xs font-bold text-gray-800 mb-1">{skill.name}</h4>
                            <div className="flex gap-3 text-[10px] text-gray-400 mb-1.5">
                                <span>Current: <span className="text-blue-600 font-bold">{skill.current}</span></span>
                                <span>Target: <span className="text-blue-600 font-bold">{skill.target}</span></span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full relative">
                                {/* Target marker */}
                                <div style={{ left: `${skill.target}%` }} className="absolute top-0 bottom-0 w-0.5 bg-blue-300 z-10"></div>
                                {/* Target light bar */}
                                <div style={{ width: `${skill.target}%` }} className="absolute top-0 bottom-0 bg-blue-50 h-1.5 rounded-r-full"></div>

                                {/* Current bar */}
                                <div style={{ width: `${skill.current}%` }} className="bg-sky-400 h-1.5 rounded-full relative z-20"></div>
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-center min-w-[50px] pt-1">
                            <span className="text-lg font-bold text-gray-800 leading-none">{skill.gap}</span>
                            <span className="text-[9px] text-gray-400 font-medium mt-0.5">Gap Score</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 text-[10px] text-gray-500 border-l-2 border-slate-300 pl-3 py-1">
                <span className="font-bold text-gray-800">@Note:</span> Identify key areas for improvement. Data is based on your recent assessments.
            </div>
        </div>
    );
}
