"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";

const SIDEBAR_LG = "(min-width: 1024px)";

/** App shell: sidebar open by default on `lg+`; passes session email into Sidebar. */
export function DashboardShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(SIDEBAR_LG);
    const update = () => setSidebarOpen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-surface-muted">
      <div
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-500 ease-in-out ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-64 transform transition-transform duration-500 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          onClose={() => setSidebarOpen(false)}
          userEmail={userEmail}
        />
      </aside>

      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-300 ease-in-out ${
          sidebarOpen ? "lg:ml-64" : ""
        }`}
      >
        <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
