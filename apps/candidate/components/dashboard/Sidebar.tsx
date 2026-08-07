"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    BookOpen,
    GraduationCap,
    ClipboardList,
    User,
    LogOut,
} from "lucide-react";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { apiRoutes } from "@/constants/api";
import { frontendRoutes } from "@/constants/frontendRoutes";
import { useI18n } from "@/contexts/I18nContext";
import { ApiCall, getUserInitials } from "@/lib/utils";

const navigation = [
    { nameKey: "sidebar.dashboard", href: "/user/dashboard", icon: LayoutDashboard },
    { nameKey: "sidebar.courses", href: "/user/courses", icon: BookOpen },
    { nameKey: "sidebar.jobs", href: "/user/jobs", icon: GraduationCap },
    { nameKey: "Applications", href: "/user/applications", icon: ClipboardList },
    { nameKey: "sidebar.profile", href: "/user/profile", icon: User },
] as const;

const isSmallScreen = () => typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches;

type SidebarUser = { fullName: string; emailOrPhone: string };

/**
 * Candidate nav + profile chip. Sign-out sends mobile viewports to
 * `mobileLogin`, desktop to the standard login route.
 */
export function Sidebar({ onClose }: { onClose?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useI18n();
    const [user, setUser] = useState<SidebarUser | null>(null);

    useEffect(() => {
        ApiCall<{ data?: { fullName?: string; emailOrPhone?: string } }>({
            url: apiRoutes.user.profile,
            method: "GET",
        })
            .then((res) => {
                if (res.ok && res.data?.data) {
                    const d = res.data.data;
                    setUser({
                        fullName: d.fullName ?? "",
                        emailOrPhone: d.emailOrPhone ?? "",
                    });
                }
            })
            .catch(() => {});
    }, []);

    function closeOnSmallScreen() {
        if (isSmallScreen()) onClose?.();
    }

    function postSignOutLoginPath() {
        return isSmallScreen() ? frontendRoutes.mobileLogin : frontendRoutes.login;
    }

    async function handleSignOut() {
        const loginPath = postSignOutLoginPath();
        try {
            const res = await ApiCall({ url: apiRoutes.auth.signout, method: "POST" });
            if (res.ok) {
                router.push(loginPath);
                router.refresh();
            }
        } catch {
            router.push(loginPath);
            router.refresh();
        }
    }

    const initials = user ? getUserInitials(user.fullName, user.emailOrPhone) : "…";

    return (
        <div className="flex h-full w-64 flex-col bg-[#3b5998] text-white shadow-xl z-10">
            <div className="flex h-20 items-center px-6 border-b border-blue-400/20">
                <Link
                    href="/user/dashboard"
                    onClick={closeOnSmallScreen}
                    className="focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
                >
                    <Image
                        src="/numee-logo.png"
                        alt="NuMee"
                        width={120}
                        height={40}
                        className="h-8 w-auto"
                        priority
                    />
                </Link>
            </div>

            <nav className="flex-1 overflow-y-auto overscroll-contain space-y-2 px-4 py-8">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    const name = t(item.nameKey);
                    return (
                        <Link
                            key={item.nameKey}
                            href={item.href}
                            onClick={closeOnSmallScreen}
                            className={`group flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                                isActive
                                    ? "bg-white/10 text-white shadow-sm backdrop-blur-sm transform scale-105"
                                    : "text-blue-100 hover:bg-white/5 hover:text-white"
                            }`}
                        >
                            <item.icon
                                className={`mr-3 h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${
                                    isActive ? "text-yellow-400" : "text-blue-200 group-hover:text-white"
                                }`}
                            />
                            {name}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-blue-400/25 bg-blue-900/20">
                <div className="p-4 space-y-3">
                    <LanguageToggle variant="sidebar" />
                    <div className="flex items-center gap-3">
                        <Link
                            href="/user/profile"
                            onClick={closeOnSmallScreen}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-300/60 bg-blue-800/40 text-sm font-semibold text-white hover:bg-blue-800/60 transition-colors"
                            aria-label={t("sidebar.profile")}
                        >
                            {initials}
                        </Link>
                        <Link
                            href="/user/profile"
                            onClick={closeOnSmallScreen}
                            className="min-w-0 flex-1"
                        >
                            <p className="truncate text-sm font-semibold text-white">
                                {user?.fullName || "—"}
                            </p>
                            <p className="truncate text-xs text-blue-100/75">
                                {user?.emailOrPhone || "—"}
                            </p>
                        </Link>
                        <button
                            type="button"
                            onClick={() => {
                                closeOnSmallScreen();
                                void handleSignOut();
                            }}
                            aria-label={t("sidebar.signOut")}
                            className="shrink-0 rounded-lg p-2 text-blue-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
