"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  Settings,
  LogOut,
} from "lucide-react";
import { apiRoutes } from "@/constants/api";
import { recruiterRoutes } from "@/constants/frontendRoutes";
import { ApiCall, getUserInitials } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: recruiterRoutes.dashboard, icon: LayoutDashboard },
  { name: "Company", href: recruiterRoutes.company, icon: Building2 },
  { name: "Team", href: recruiterRoutes.team, icon: Users },
  { name: "Jobs", href: recruiterRoutes.jobs, icon: Briefcase },
  { name: "Settings", href: recruiterRoutes.settings, icon: Settings },
] as const;

const isSmallScreen = () =>
  typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches;

type SidebarUser = { fullName: string; email: string };

/**
 * Recruiter nav on `auth-teal` (same ink as login branding panel).
 * Resolves display name from team members matching `userEmail` (session),
 * falling back to the first member.
 */
export function Sidebar({
  onClose,
  userEmail,
}: {
  onClose?: () => void;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SidebarUser | null>(
    userEmail ? { fullName: "", email: userEmail } : null,
  );

  useEffect(() => {
    ApiCall<{
      members?: {
        user: { firstName: string; lastName: string; emailOrPhone: string };
        role: string;
      }[];
    }>({
      url: apiRoutes.recruiter.team,
      method: "GET",
    })
      .then((res) => {
        const members = res.data?.members;
        if (!res.ok || !members?.length) return;
        const self =
          (userEmail &&
            members.find(
              (m) =>
                m.user.emailOrPhone.toLowerCase() === userEmail.toLowerCase(),
            )?.user) ||
          members[0]!.user;
        setUser({
          fullName: `${self.firstName} ${self.lastName}`.trim(),
          email: self.emailOrPhone,
        });
      })
      .catch(() => {});
  }, [userEmail]);

  function closeOnSmallScreen() {
    if (isSmallScreen()) onClose?.();
  }

  async function handleSignOut() {
    try {
      await ApiCall({
        url: apiRoutes.recruiter.auth.logout,
        method: "POST",
      });
    } finally {
      router.push(recruiterRoutes.login);
      router.refresh();
    }
  }

  const initials = user
    ? getUserInitials(user.fullName, user.email)
    : "…";

  return (
    <div className="z-10 flex h-full w-64 flex-col bg-auth-teal text-auth-on-panel shadow-xl">
      <div className="flex h-20 items-center border-b border-auth-on-panel/15 px-6">
        <Link
          href={recruiterRoutes.dashboard}
          onClick={closeOnSmallScreen}
          className="rounded focus:outline-none focus:ring-2 focus:ring-auth-panel-accent/60"
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

      <nav className="flex-1 space-y-2 px-4 py-8">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== recruiterRoutes.dashboard &&
              pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeOnSmallScreen}
              className={`group flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "scale-[1.02] bg-auth-on-panel/10 text-auth-on-panel shadow-sm backdrop-blur-sm"
                  : "text-auth-on-panel/80 hover:bg-auth-on-panel/5 hover:text-auth-on-panel"
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive
                    ? "text-auth-panel-accent"
                    : "text-auth-on-panel/70 group-hover:text-auth-on-panel"
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-auth-on-panel/15 bg-black/10">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Link
              href={recruiterRoutes.settings}
              onClick={closeOnSmallScreen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-auth-on-panel/40 bg-auth-on-panel/10 text-sm font-semibold text-auth-on-panel transition-colors hover:bg-auth-on-panel/20"
              aria-label="Settings"
            >
              {initials}
            </Link>
            <Link
              href={recruiterRoutes.settings}
              onClick={closeOnSmallScreen}
              className="min-w-0 flex-1"
            >
              <p className="truncate text-sm font-semibold text-auth-on-panel">
                {user?.fullName || "—"}
              </p>
              <p className="truncate text-xs text-auth-on-panel/70">
                {user?.email || "—"}
              </p>
            </Link>
            <button
              type="button"
              onClick={() => {
                closeOnSmallScreen();
                void handleSignOut();
              }}
              aria-label="Sign out"
              className="shrink-0 cursor-pointer rounded-lg p-2 text-auth-on-panel/70 transition-colors hover:bg-auth-on-panel/10 hover:text-auth-on-panel"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
