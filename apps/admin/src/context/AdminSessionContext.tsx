import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Outlet } from "react-router-dom";
import { apiRoutes, ApiCall } from "@numee/shared";

export type AdminMe = { fullName: string; emailOrPhone: string };

type AdminSessionStatus = "loading" | "ok" | "unauth";

type AdminSessionValue = {
  status: AdminSessionStatus;
  user: AdminMe | null;
};

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

/**
 * Loads `/api/admin/auth/me` once for the authenticated admin shell and shares
 * status/user with layout chrome (sidebar/header) and the route gate.
 */
export function AdminSessionProvider({ children }: { children?: ReactNode }) {
  const [status, setStatus] = useState<AdminSessionStatus>("loading");
  const [user, setUser] = useState<AdminMe | null>(null);

  useEffect(() => {
    let cancelled = false;
    ApiCall<AdminMe>({ url: apiRoutes.admin.auth.me, method: "GET" })
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.data) {
          setUser({
            fullName: res.data.fullName ?? "",
            emailOrPhone: res.data.emailOrPhone ?? "",
          });
          setStatus("ok");
          return;
        }
        setUser(null);
        setStatus("unauth");
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setStatus("unauth");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ status, user }), [status, user]);

  return (
    <AdminSessionContext.Provider value={value}>
      {children ?? <Outlet />}
    </AdminSessionContext.Provider>
  );
}

/** Session status/user from the nearest `AdminSessionProvider`. */
export function useAdminSession(): AdminSessionValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error("useAdminSession must be used within AdminSessionProvider");
  }
  return ctx;
}
