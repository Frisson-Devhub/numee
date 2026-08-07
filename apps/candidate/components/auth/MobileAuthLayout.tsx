"use client";

import { MobileAuthShell } from "@numee/shared/components";

const NUMEE_LOGO = "/numee-logo.png";

type MobileAuthLayoutProps = {
  children: React.ReactNode;
};

/**
 * Mobile-first auth shell: brand header + white sheet with large top radius (matches app / PWA login).
 */
export function MobileAuthLayout({ children }: MobileAuthLayoutProps) {
  return <MobileAuthShell logoSrc={NUMEE_LOGO}>{children}</MobileAuthShell>;
}
