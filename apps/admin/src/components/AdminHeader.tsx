import { useState, useEffect } from "react";
import { Menu, Search } from "lucide-react";
import { apiRoutes, ApiCall } from "@numee/shared";

function getInitials(fullName: string): string {
  const trimmed = fullName.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    return trimmed.slice(0, 2).toUpperCase();
  }
  return "AD";
}

export function AdminHeader() {
  const [initials, setInitials] = useState<string>("AD");

  useEffect(() => {
    ApiCall<{ data?: { fullName?: string; emailOrPhone?: string } }>({
      url: apiRoutes.user.profile,
      method: "GET",
    })
      .then((res) => {
        if (res.ok && res.data?.data) {
          const d = res.data.data;
          setInitials(getInitials(d.fullName ?? ""));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 shadow-sm">
      <button
        type="button"
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search ..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-gray-100 transition-colors"
          aria-label="Profile"
        >
          <div className="h-8 w-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-sm font-medium">
            {initials}
          </div>
        </button>
      </div>
    </header>
  );
}
