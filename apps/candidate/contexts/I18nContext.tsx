"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    LOCALE_STORAGE_KEY,
    getStoredLocale,
    messagesByLocale,
    translate,
    type Locale,
    type Messages,
} from "@/lib/i18n";

type I18nContextValue = {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    messages: Messages;
    t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

/** Hydrates locale from localStorage and keeps `document.documentElement.lang` in sync. */
export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>("en");
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setLocaleState(getStoredLocale());
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        document.documentElement.lang = locale;
        try {
            localStorage.setItem(LOCALE_STORAGE_KEY, locale);
        } catch {
            // ignore
        }
    }, [locale, hydrated]);

    const setLocale = useCallback((next: Locale) => {
        setLocaleState(next);
    }, []);

    const t = useCallback(
        (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
        [locale]
    );

    const value = useMemo<I18nContextValue>(
        () => ({
            locale,
            setLocale,
            messages: messagesByLocale[locale],
            t,
        }),
        [locale, setLocale, t]
    );

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Access `t` / `locale`; must be used under `I18nProvider`. */
export function useI18n(): I18nContextValue {
    const ctx = useContext(I18nContext);
    if (!ctx) {
        throw new Error("useI18n must be used within I18nProvider");
    }
    return ctx;
}
