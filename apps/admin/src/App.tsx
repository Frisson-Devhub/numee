import { Navigate, Route, Routes } from "react-router-dom";
import { adminRoutes } from "@numee/shared";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AdminSessionProvider } from "@/context/AdminSessionContext";
import { RequireAdminAuth } from "@/components/RequireAdminAuth";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { UserManagementPage } from "@/pages/UserManagementPage";
import { UniversityManagementPage } from "@/pages/UniversityManagementPage";
import { AddUniversityPage } from "@/pages/AddUniversityPage";
import { UniversityDetailPage } from "@/pages/UniversityDetailPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { CommunicationPage } from "@/pages/CommunicationPage";
import { LogsAuditsPage } from "@/pages/LogsAuditsPage";
import { CatalogPage } from "@/pages/CatalogPage";

/**
 * Admin SPA routes: public `/login` (no chrome); authenticated shell mounts
 * layout immediately while session resolves in the content area.
 */
export default function App() {
  return (
    <Routes>
      <Route path={adminRoutes.login} element={<LoginPage />} />
      <Route element={<AdminSessionProvider />}>
        <Route element={<AdminLayout />}>
          <Route element={<RequireAdminAuth />}>
            <Route index element={<Navigate to={adminRoutes.dashboard} replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="user-management" element={<UserManagementPage />} />
            <Route path="university-management" element={<UniversityManagementPage />} />
            <Route path="university-management/add" element={<AddUniversityPage />} />
            <Route path="university-management/:universityId" element={<UniversityDetailPage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="communication" element={<CommunicationPage />} />
            <Route path="logs-audits" element={<LogsAuditsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={adminRoutes.dashboard} replace />} />
    </Routes>
  );
}
