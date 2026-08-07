"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

export default function NotFound() {
    const { t } = useI18n();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
            <div className="text-center max-w-md">
                <p className="text-6xl font-bold text-gray-200 select-none">404</p>
                <h1 className="mt-4 text-2xl font-semibold text-gray-900">{t("notFound.title")}</h1>
                <p className="mt-2 text-gray-600">{t("notFound.description")}</p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                    >
                        <Home className="h-4 w-4" />
                        {t("notFound.backHome")}
                    </Link>
                    <Link
                        href="/user/dashboard"
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t("notFound.goDashboard")}
                    </Link>
                </div>
            </div>
        </div>
    );
}
