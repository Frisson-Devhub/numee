import en from "./locales/en.json";
import de from "./locales/de.json";
import fr from "./locales/fr.json";

/** Add an entry here (and a matching JSON file) when supporting a new language. */
export const localeRegistry = [
    { locale: "en", flag: "🇬🇧", nameKey: "common.language.english", apiLanguage: "English" },
    { locale: "de", flag: "🇩🇪", nameKey: "common.language.german", apiLanguage: "German" },
    { locale: "fr", flag: "🇫🇷", nameKey: "common.language.french", apiLanguage: "French" },
] as const;

/** Supported UI locale codes derived from `localeRegistry`. */
export type Locale = (typeof localeRegistry)[number]["locale"];

/** Shape of a locale JSON message file (typed from English). */
export type Messages = typeof en;

/** localStorage key for the active UI locale. */
export const LOCALE_STORAGE_KEY = "numee-locale";

/** Fallback locale when storage is empty or invalid. */
export const DEFAULT_LOCALE: Locale = "en";

/** Message catalogs keyed by locale code. */
export const messagesByLocale: Record<Locale, Messages> = { en, de, fr };

/** Keys under `aiQuestionnaire.assistant.status` for typed status copy. */
export type AiQuestionnaireStatusKey = keyof Messages["aiQuestionnaire"]["assistant"]["status"];

/** Type guard: string is a registered `Locale`. */
export function isLocale(value: string): value is Locale {
    return localeRegistry.some((entry) => entry.locale === value);
}

/** Registry entry for a locale (flag, message key, API language label). */
export function getLocaleOption(locale: Locale) {
    return localeRegistry.find((entry) => entry.locale === locale);
}

/** Language label expected by the virtual assistant dispatch API (e.g. "English", "German"). */
export function getApiLanguage(locale: Locale): string {
    return getLocaleOption(locale)?.apiLanguage ?? localeRegistry[0].apiLanguage;
}

const LEGACY_LOCALE_STORAGE_KEY = "ai-questionnaire-locale";

/** Read locale from localStorage; falls back to legacy AI-questionnaire key, then `en`. */
export function getStoredLocale(): Locale {
    if (typeof window === "undefined") return "en";
    try {
        const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
        if (stored && isLocale(stored)) return stored;
        const legacy = localStorage.getItem(LEGACY_LOCALE_STORAGE_KEY);
        if (legacy && isLocale(legacy)) return legacy;
    } catch {
        // ignore
    }
    return DEFAULT_LOCALE;
}

function resolvePath(dict: Record<string, unknown>, path: string): unknown {
    const parts = path.split(".");
    let cur: unknown = dict;
    for (const part of parts) {
        if (cur == null || typeof cur !== "object" || !(part in cur)) return undefined;
        cur = (cur as Record<string, unknown>)[part];
    }
    return cur;
}

/**
 * Resolve a dotted message key (e.g. `sidebar.dashboard`) and interpolate `{param}` placeholders.
 * Returns the key itself when missing.
 */
export function translate(
    locale: Locale,
    key: string,
    params?: Record<string, string | number>
): string {
    const dict = messagesByLocale[locale] as unknown as Record<string, unknown>;
    const value = resolvePath(dict, key);
    if (typeof value !== "string") return key;

    if (!params) return value;
    return Object.entries(params).reduce(
        (result, [paramKey, paramValue]) =>
            result.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue)),
        value
    );
}