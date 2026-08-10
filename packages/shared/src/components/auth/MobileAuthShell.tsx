"use client";

import type { ReactNode } from "react";
import { AuthBrandingCopy } from "./AuthBrandingCopy";
import { EnterpriseShieldBadge } from "./EnterpriseShieldBadge";
import type { AuthShellPortal } from "./AuthShell";

const PORTAL_PANEL_CLASS: Record<AuthShellPortal, string> = {
  candidate: "bg-auth-navy",
  recruiter: "bg-auth-teal",
  admin: "bg-auth-charcoal",
};

export type MobileAuthShellProps = {
  children: ReactNode;
  logoSrc: string;
  logoAlt?: string;
  branding?: ReactNode;
  badge?: ReactNode;
  /** Matches desktop AuthShell portal accents / token scoping. */
  portal?: AuthShellPortal;
};

/**
 * Mobile-first auth shell: brand header + cool mist sheet with large top radius.
 * Framework-agnostic — pass logoSrc from the consuming app.
 */
export function MobileAuthShell({
  children,
  logoSrc,
  logoAlt = "NuMee",
  branding,
  badge,
  portal = "candidate",
}: MobileAuthShellProps) {
  const panelClass = PORTAL_PANEL_CLASS[portal];

  return (
    <div
      className={`flex h-dvh max-h-dvh flex-col overflow-hidden font-sans text-auth-on-panel ${panelClass}`}
      data-auth-portal={portal}
    >
      <header className="relative shrink-0 px-5 pb-4 pt-6 sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background: `
              radial-gradient(ellipse 90% 70% at 10% 0%, color-mix(in srgb, var(--auth-panel-accent) 22%, transparent), transparent 65%),
              linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.25) 100%)
            `,
          }}
        />
        <div className="relative z-10 flex flex-col gap-5">
          <div className="auth-animate-fade inline-block rounded-md pt-3 focus-within:ring-2 focus-within:ring-auth-on-panel/45">
            <img
              src={logoSrc}
              alt={logoAlt}
              width={273}
              height={60}
              className="h-8 w-auto sm:h-9"
            />
          </div>
          <div className="auth-animate-rise-delay flex flex-col">
            {branding ?? <AuthBrandingCopy />}
            {badge ?? <EnterpriseShieldBadge className="mt-5" />}
          </div>
        </div>
      </header>

      <main className="auth-animate-form relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-t-2xl bg-surface px-5 pb-10 pt-8 text-foreground shadow-auth-sheet sm:rounded-t-3xl sm:px-6">
        <div className="mx-auto flex w-full max-w-md flex-col space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
