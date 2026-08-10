import { Navigate, Outlet, useLocation } from "react-router-dom";
import { adminRoutes } from "@numee/shared";
import { useAdminSession } from "@/context/AdminSessionContext";
import { AdminContentSkeleton } from "@/components/Skeleton";

/**
 * Content-area gate for admin routes (nested under `AdminLayout`).
 * Keeps sidebar/header mounted: shows a main-content skeleton until `/me`
 * resolves, then either renders the page `<Outlet />` or redirects to `/login`.
 * Does not blank the full viewport during the session check.
 */
export function RequireAdminAuth() {
  const location = useLocation();
  const { status } = useAdminSession();

  if (status === "loading") {
    return <AdminContentSkeleton />;
  }

  if (status === "unauth") {
    return (
      <Navigate
        to={adminRoutes.login}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
