"use client";

import { AuthShell } from "@numee/shared/components";

const AUTH_PANEL_BG = "/auth-panel-bg.png";
const NUMEE_LOGO = "/numee-logo.png";
const NUMEE_LOGO_ON_LIGHT = "/numee-logo-dark.png";

/** Candidate auth chrome: shared `AuthShell` with local logo / panel assets. */
export function AuthLayout({
  children,
  rightPanelOverflow,
  maxWidth = "max-w-md",
  hideSidebar = false,
  background = "bg-surface-muted",
  fillViewport = false,
  fitViewport = false,
}: {
  children: React.ReactNode;
  rightPanelOverflow?: boolean;
  maxWidth?: string;
  hideSidebar?: boolean;
  background?: string;
  /** On mobile, lock content to one screen height without page scroll. */
  fillViewport?: boolean;
  /** Lock the shell to one viewport at every breakpoint (no page scroll). */
  fitViewport?: boolean;
}) {
  return (
    <AuthShell
      portal="candidate"
      logoSrc={NUMEE_LOGO}
      logoOnLightSrc={NUMEE_LOGO_ON_LIGHT}
      bgSrc={AUTH_PANEL_BG}
      logoHref="/user/dashboard"
      rightPanelOverflow={rightPanelOverflow}
      maxWidth={maxWidth}
      hideSidebar={hideSidebar}
      background={background}
      fillViewport={fillViewport}
      fitViewport={fitViewport}
    >
      {children}
    </AuthShell>
  );
}
