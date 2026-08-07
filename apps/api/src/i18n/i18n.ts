/** Minimal i18n helpers for virtual-assistant dispatch (API language labels). */

export const localeRegistry = [
  { locale: "en", apiLanguage: "English" },
  { locale: "de", apiLanguage: "German" },
  { locale: "fr", apiLanguage: "French" },
] as const;

export type Locale = (typeof localeRegistry)[number]["locale"];

export const DEFAULT_LOCALE: Locale = "en";

/** Type guard for supported UI locales. */
export function isLocale(value: string): value is Locale {
  return localeRegistry.some((entry) => entry.locale === value);
}

/** Map locale code to the language label expected by the agent API. */
export function getApiLanguage(locale: Locale): string {
  return (
    localeRegistry.find((entry) => entry.locale === locale)?.apiLanguage ??
    localeRegistry[0].apiLanguage
  );
}
