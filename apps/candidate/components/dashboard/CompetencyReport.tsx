"use client";

const DEFAULT_SKILLS = [
    { name: "Communication Skills", level: "Level 2", color: "bg-[#FAAD14]", percentage: 50 },
    { name: "Problem Solving", level: "Level 3", color: "bg-[#5893F5]", percentage: 75 },
    { name: "Technical Knowledge", level: "Level 4", color: "bg-[#2FA78F]", percentage: 75 },
];

const BAR_COLORS = ["bg-[#FAAD14]", "bg-[#5893F5]", "bg-[#2FA78F]"];

export interface CompetencyReportSkill {
    name: string;
    level: string;
    percentage: number;
}

interface CompetencyReportProps {
    skills?: CompetencyReportSkill[] | null;
}

/** Skill bars from assessment payload; placeholder skills when data is missing. */
export function CompetencyReport({ skills: propSkills }: CompetencyReportProps) {
    const skills = propSkills?.length
        ? propSkills.map((s, i) => ({
            name: s.name,
            level: s.level,
            color: BAR_COLORS[i % BAR_COLORS.length],
            percentage: Math.min(100, Math.max(0, s.percentage)),
        }))
        : DEFAULT_SKILLS;

    return (
        <div className="space-y-5">
            {skills.map((skill) => (
                <div key={skill.name}>
                    <div className="flex justify-between mb-1.5 items-end">
                        <span className="text-xs font-medium text-gray-500">{skill.name}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                            {skill.level}
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                            className={`${skill.color} h-5 rounded-full relative`}
                            style={{ width: `${skill.percentage}%` }}
                        >
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white">
                                {skill.percentage}%
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
