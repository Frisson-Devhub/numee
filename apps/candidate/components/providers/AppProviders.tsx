"use client";

import { I18nProvider } from "@/contexts/I18nContext";
import type { ReactNode } from "react";

/** Root client providers for the candidate app (currently i18n only). */
export function AppProviders({ children }: { children: ReactNode }) {
    return <I18nProvider>{children}</I18nProvider>;
}
