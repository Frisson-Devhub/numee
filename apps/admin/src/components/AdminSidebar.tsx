import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { apiRoutes, ApiCall, adminRoutes } from "@numee/shared";
import { adminSidebarNavigation } from "@/constants/navigation";
import { useAdminSession } from "@/context/AdminSessionContext";
import { Skeleton } from "@/components/Skeleton";

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

/**
 * Admin nav + sign-out. Uses shared admin session for the user block and
 * admin `logout`; stays on the admin portal after sign-out.
 */
export function AdminSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { status, user } = useAdminSession();
  const sessionPending = status === "loading";

  async function handleSignOut() {
    try {
      await ApiCall({ url: apiRoutes.admin.auth.logout, method: "POST" });
    } catch {
      // still redirect to admin login
    }
    navigate(adminRoutes.login, { replace: true });
  }

  return (
    <div className="z-10 flex h-full w-64 flex-col bg-auth-charcoal text-auth-on-panel shadow-xl">
      <div className="flex h-20 items-center border-b border-auth-on-panel/10 px-6">
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
                isActive
                  ? "bg-auth-on-panel/10 text-auth-on-panel"
                  : "text-auth-on-panel-muted hover:bg-auth-on-panel/5 hover:text-auth-on-panel"
              }`}
              aria-disabled={sessionPending}
              tabIndex={sessionPending ? -1 : undefined}
              onClick={sessionPending ? (e) => e.preventDefault() : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-brand-accent" />
              )}
              <item.icon className="mr-3 h-5 w-5 shrink-0 text-auth-on-panel" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-auth-on-panel/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          {sessionPending || !user ? (
            <>
              <Skeleton tone="onPanel" className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton tone="onPanel" className="h-3.5 w-24" />
                <Skeleton
                  tone="onPanel"
                  className="h-3 w-32 opacity-70"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary-bright text-sm font-medium text-on-brand">
                {getInitials(user.fullName, user.emailOrPhone)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-auth-on-panel">{user.fullName}</p>
                <p className="truncate text-xs text-auth-on-panel-muted">{user.emailOrPhone}</p>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={sessionPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-auth-on-panel-muted transition-colors hover:bg-auth-on-panel/10 hover:text-auth-on-panel disabled:pointer-events-none disabled:opacity-40"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
