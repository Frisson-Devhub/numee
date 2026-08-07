"use client";

import { AuthShell } from "@numee/shared/components";

const AUTH_PANEL_BG = "/auth-panel-bg.png";
const NUMEE_LOGO = "/numee-logo.png";

/** Candidate auth chrome: shared `AuthShell` with local logo / panel assets. */
export function AuthLayout({
  children,
  rightPanelOverflow,
  maxWidth = "max-w-md",
  hideSidebar = false,
  background = "bg-white",
  fillViewport = false,
}: {
  children: React.ReactNode;
  rightPanelOverflow?: boolean;
  maxWidth?: string;
  hideSidebar?: boolean;
  background?: string;
  /** On mobile, lock content to one screen height without page scroll. */
  fillViewport?: boolean;
}) {
  return (
    <AuthShell
      logoSrc={NUMEE_LOGO}
      bgSrc={AUTH_PANEL_BG}
      logoHref="/user/dashboard"
      rightPanelOverflow={rightPanelOverflow}
      maxWidth={maxWidth}
      hideSidebar={hideSidebar}
      background={background}
      fillViewport={fillViewport}
    >
      {children}
    </AuthShell>
  );
}
