import { Outlet } from "react-router-dom";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminHeader } from "@/components/AdminHeader";

/**
 * Authenticated admin chrome (sidebar + header). Mounts under
 * `AdminSessionProvider` so session can resolve in the main `<Outlet />`
 * without replacing this shell.
 */
export function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden lg:flex lg:shrink-0">
        <AdminSidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
