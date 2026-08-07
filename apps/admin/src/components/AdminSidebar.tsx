import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { apiRoutes, ApiCall, adminRoutes } from "@numee/shared";
import { adminSidebarNavigation } from "@/constants/navigation";
import { candidateLoginUrl } from "@/lib/candidateUrl";

function getInitials(fullName: string, emailOrPhone: string): string {
  const trimmed = fullName.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    return trimmed.slice(0, 2).toUpperCase();
  }
  if (emailOrPhone) return emailOrPhone.slice(0, 2).toUpperCase();
  return "AD";
}

type AdminUser = { fullName: string; emailOrPhone: string };

/**
 * Admin nav + sign-out. Clears the Nest session then hard-navigates to the
 * candidate login (shared cookie domain / local ports).
 */
export function AdminSidebar() {
  const { pathname } = useLocation();
  const [user, setUser] = useState<AdminUser | null>(null);

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

  async function handleSignOut() {
    const loginUrl = candidateLoginUrl();
    try {
      await ApiCall({ url: apiRoutes.auth.signout, method: "POST" });
    } catch {
      // still redirect to candidate login
    }
    window.location.href = loginUrl;
  }

  return (
    <div className="flex h-full w-64 flex-col bg-[#1e3a5f] text-white shadow-xl z-10">
      <div className="flex h-20 items-center px-6 border-b border-white/10">
        <Link to={adminRoutes.dashboard} className="inline-flex items-center">
          <img src="/numee-logo.png" alt="NuMee" width={120} height={40} className="h-8 w-auto" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        {adminSidebarNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`group relative flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive ? "bg-white/10 text-white" : "text-white/90 hover:bg-white/5 hover:text-white"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r" />
              )}
              <item.icon className="mr-3 h-5 w-5 shrink-0 text-white" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-slate-500 flex items-center justify-center text-sm font-medium shrink-0">
            {user ? getInitials(user.fullName, user.emailOrPhone) : "…"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.fullName || "—"}</p>
            <p className="text-xs text-white/70 truncate">{user?.emailOrPhone || "—"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
