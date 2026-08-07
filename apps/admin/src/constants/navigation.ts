import {
  LayoutDashboard,
  Users,
  BarChart3,
  Megaphone,
  Hourglass,
  Tags,
} from "lucide-react";
import { adminRoutes } from "@numee/shared";

/** Sidebar items keyed to shared `adminRoutes` paths. */
export const adminSidebarNavigation = [
  { name: "Dashboard", href: adminRoutes.dashboard, icon: LayoutDashboard },
  { name: "User Management", href: adminRoutes.userManagement, icon: Users },
  { name: "Catalog", href: adminRoutes.catalog, icon: Tags },
  { name: "Analytics Reports", href: adminRoutes.analytics, icon: BarChart3 },
  { name: "Communication", href: adminRoutes.communication, icon: Megaphone },
  { name: "Logs & Audits", href: adminRoutes.logsAudits, icon: Hourglass },
];
