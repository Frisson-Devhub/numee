"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { localeRegistry, type Locale } from "@/lib/i18n";

type LanguageToggleProps = {
    variant?: "sidebar" | "inline";
};

/** Locale picker wired to `useI18n`; `sidebar` opens upward, `inline` drops down. */
export function LanguageToggle({ variant = "inline" }: LanguageToggleProps) {
    const { locale, setLocale, t } = useI18n();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const current = localeRegistry.find((entry) => entry.locale === locale) ?? localeRegistry[0];

    useEffect(() => {
        if (!open) return;
        function handlePointerDown(event: MouseEvent) {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setOpen(false);
        }
        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [open]);

    function selectLocale(next: Locale) {
        setLocale(next);
        setOpen(false);
    }

    const isSidebar = variant === "sidebar";

    return (
        <div ref={rootRef} className={`relative ${isSidebar ? "w-full" : "shrink-0"}`}>
            <label
                className={`block ${isSidebar ? "px-1 text-[10px] font-semibold uppercase tracking-wider text-blue-200/80 mb-1" : "sr-only"}`}
            >
                {t("common.language.label")}
            </label>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={t("common.language.label")}
                className={
                    isSidebar
                        ? "flex w-full items-center justify-between gap-2 rounded-lg bg-blue-950/30 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-950/50 cursor-pointer"
                        : "flex min-w-36 items-center justify-between gap-2 rounded-lg border border-white/20 bg-slate-900/50 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-slate-900/70 cursor-pointer"
                }
            >
                <span className="flex items-center gap-2 truncate">
                    <span aria-hidden>{current.flag}</span>
                    <span className="truncate">{t(current.nameKey)}</span>
                </span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 opacity-70 transition-transform ${open ? "rotate-180" : ""}`}
                    aria-hidden
                />
            </button>

            {open && (
                <ul
                    role="listbox"
                    aria-label={t("common.language.label")}
                    className={
                        isSidebar
                            ? "absolute bottom-full left-0 right-0 z-50 mb-1 max-h-48 overflow-auto rounded-lg border border-blue-400/20 bg-[#2d4a8a] py-1 shadow-lg"
                            : "absolute right-0 top-full z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/15 bg-slate-900 py-1 shadow-lg"
                    }
                >
                    {localeRegistry.map((entry) => {
                        const isSelected = entry.locale === locale;
                        return (
                            <li key={entry.locale} role="option" aria-selected={isSelected}>
                                <button
                                    type="button"
                                    onClick={() => selectLocale(entry.locale)}
                                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                                        isSidebar
                                            ? isSelected
                                                ? "bg-white/15 text-white"
                                                : "text-blue-100 hover:bg-white/10 hover:text-white"
                                            : isSelected
                                              ? "bg-white/10 text-white"
                                              : "text-slate-200 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    <span aria-hidden>{entry.flag}</span>
                                    <span className="flex-1 truncate">{t(entry.nameKey)}</span>
                                    {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
