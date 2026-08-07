import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "@/layouts/AdminLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { UserManagementPage } from "@/pages/UserManagementPage";
import { UniversityManagementPage } from "@/pages/UniversityManagementPage";
import { AddUniversityPage } from "@/pages/AddUniversityPage";
import { UniversityDetailPage } from "@/pages/UniversityDetailPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { CommunicationPage } from "@/pages/CommunicationPage";
import { LogsAuditsPage } from "@/pages/LogsAuditsPage";
import { CatalogPage } from "@/pages/CatalogPage";

/** Admin SPA routes under `AdminLayout`; unknown paths redirect to dashboard. */
export default function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
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
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
