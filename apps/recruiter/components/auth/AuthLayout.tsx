"use client";

import { AuthShell } from "@numee/shared/components";
import { recruiterRoutes } from "@/constants/frontendRoutes";

const AUTH_PANEL_BG = "/auth-panel-bg.png";
/** Light wordmark for dark branding panel */
const NUMEE_LOGO = "/numee-logo.png";
/** Dark wordmark for light form surfaces */
const NUMEE_LOGO_ON_LIGHT = "/numee-logo-dark.png";

/**
 * Recruiter auth chrome: shared `AuthShell` with light/dark wordmarks and
 * logo link to the recruiter dashboard.
 */
export function AuthLayout({
  children,
  rightPanelOverflow,
  maxWidth = "max-w-md",
  hideSidebar = false,
  background = "bg-surface",
  fillViewport = false,
}: {
  children: React.ReactNode;
  rightPanelOverflow?: boolean;
  maxWidth?: string;
  hideSidebar?: boolean;
  background?: string;
  fillViewport?: boolean;
}) {
  return (
    <AuthShell
      logoSrc={NUMEE_LOGO}
      logoOnLightSrc={NUMEE_LOGO_ON_LIGHT}
      bgSrc={AUTH_PANEL_BG}
      logoHref={recruiterRoutes.dashboard}
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
