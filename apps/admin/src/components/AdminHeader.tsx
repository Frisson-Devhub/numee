import { Menu, Search } from "lucide-react";
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

/** Top bar for the admin shell; avatar initials come from the shared admin session. */
export function AdminHeader() {
  const { status, user } = useAdminSession();
  const sessionPending = status === "loading";

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 shadow-sm">
      <button
        type="button"
        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="max-w-xl flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search ..."
            disabled={sessionPending}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-gray-100"
          aria-label="Profile"
        >
          {sessionPending || !user ? (
            <Skeleton className="h-8 w-8 rounded-full" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-sm font-medium text-white">
              {getInitials(user.fullName, user.emailOrPhone)}
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
