"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { pendingSharedJobPath } from "@/lib/job-match";

const SIDEBAR_LG = "(min-width: 1024px)";

/** App shell: sidebar open by default on `lg+`, overlay drawer on smaller screens. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const mq = window.matchMedia(SIDEBAR_LG);
        const update = () => setSidebarOpen(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        const target = pendingSharedJobPath();
        if (!target) return;
        if (pathname === target) return;
        // Leave other job-detail URLs alone; that page owns the share stash.
        if (/^\/user\/jobs\/[^/]+$/.test(pathname)) return;
        router.replace(target);
    }, [pathname, router]);

    return (
        <div className="flex h-dvh min-h-dvh overflow-hidden bg-gray-50">
            {/* Overlay when sidebar is open - mobile only; desktop toggle is button-only */}
            <div
                className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-500 ease-in-out ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                aria-hidden="true"
                onClick={() => setSidebarOpen(false)}
            />
            {/* Sidebar - toggles on all screen sizes */}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-500 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Main content - shifts on desktop when sidebar is open */}
            <div
                className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-300 ease-in-out ${sidebarOpen ? "lg:ml-64" : ""
                    }`}
            >
                <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
                <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
