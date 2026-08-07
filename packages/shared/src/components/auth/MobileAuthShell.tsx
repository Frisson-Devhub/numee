"use client";

import type { ReactNode } from "react";
import { AuthBrandingCopy } from "./AuthBrandingCopy";
import { EnterpriseShieldBadge } from "./EnterpriseShieldBadge";

export type MobileAuthShellProps = {
  children: ReactNode;
  logoSrc: string;
  logoAlt?: string;
  branding?: ReactNode;
  badge?: ReactNode;
};

/**
 * Mobile-first auth shell: brand header + white sheet with large top radius.
 * Framework-agnostic — pass logoSrc from the consuming app.
 */
export function MobileAuthShell({
  children,
  logoSrc,
  logoAlt = "NuMee",
  branding,
  badge,
}: MobileAuthShellProps) {
  return (
    <div className="h-dvh max-h-dvh flex flex-col overflow-hidden bg-auth-navy">
      <header className="shrink-0 px-5 pt-6 pb-4 sm:px-6 flex flex-col gap-6">
        <div className="inline-block focus:outline-none focus:ring-2 focus:ring-white/50 rounded pt-4">
          <img src={logoSrc} alt={logoAlt} width={273} height={60} className="h-9 w-auto" />
        </div>
        <div className="flex flex-col">
          {branding ?? <AuthBrandingCopy />}
          {badge ?? <EnterpriseShieldBadge className="mt-5 rounded-[50px] border-none" />}
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain bg-white rounded-t-[1.75rem] shadow-auth-sheet px-5 pt-8 pb-10 sm:px-6 sm:rounded-t-4xl">
        <div className="w-full max-w-md mx-auto flex flex-col">{children}</div>
      </main>
    </div>
  );
}
