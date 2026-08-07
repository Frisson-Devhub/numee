"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";

/** Three-dot loading indicator with animated active state (sidebar blue/white) */
function ComingSoonDots() {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setActiveIndex((i) => (i + 1) % 3), 400);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="flex items-center justify-center gap-2 my-6" aria-hidden>
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className={`h-2 w-2 rounded-full transition-colors duration-300 ${i === activeIndex ? "bg-white" : "bg-blue-200/60"}`}
                />
            ))}
        </div>
    );
}

export function ComingSoonBanner() {
    const { t } = useI18n();

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] rounded-xl text-center px-6 bg-linear-to-br from-blue-500 to-orange-500 relative overflow-hidden">
            <h1 className="text-3xl sm:text-6xl mb-2 font-bold text-white tracking-tight">
                {t("comingSoon.title")}
            </h1>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mt-1 bg-[#3b5998] bg-clip-text text-transparent">
                {t("comingSoon.subtitle")}
            </h2>
            <ComingSoonDots />
            <p className="text-blue-100/90 text-sm sm:text-base max-w-md font-normal">
                {t("comingSoon.description")}
            </p>
        </div>
    );
}
