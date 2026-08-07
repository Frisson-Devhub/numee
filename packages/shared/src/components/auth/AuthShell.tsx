"use client";

import type { ReactNode } from "react";
import { AuthBrandingCopy } from "./AuthBrandingCopy";
import { EnterpriseShieldBadge } from "./EnterpriseShieldBadge";

export type AuthShellProps = {
  children: ReactNode;
  /** Brand logo for dark surfaces (left panel / dark chrome). */
  logoSrc: string;
  /**
   * Brand logo for light surfaces (form column header).
   * Falls back to `logoSrc` when omitted.
   */
  logoOnLightSrc?: string;
  /** Optional left-panel background image URL. */
  bgSrc?: string;
  /** Logo / home link href. */
  logoHref?: string;
  logoAlt?: string;
  rightPanelOverflow?: boolean;
  maxWidth?: string;
  hideSidebar?: boolean;
  background?: string;
  /** On mobile, lock content to one screen height without page scroll. */
  fillViewport?: boolean;
  /** Optional branding copy override (defaults to AuthBrandingCopy). */
  branding?: ReactNode;
  /** Optional badge override (defaults to EnterpriseShieldBadge). */
  badge?: ReactNode;
};

/**
 * Framework-agnostic auth layout: branding panel + form column.
 * Uses plain `<img>` / `<a>` so apps can inject Next-optimized assets via src props
 * or wrap with their own Image/Link outside this shell.
 */
export function AuthShell({
  children,
  logoSrc,
  logoOnLightSrc,
  bgSrc,
  logoHref = "#",
  logoAlt = "NuMee",
  rightPanelOverflow,
  maxWidth = "max-w-md",
  hideSidebar = false,
  background = "bg-white",
  fillViewport = false,
  branding,
  badge,
}: AuthShellProps) {
  const brandingContent = branding ?? <AuthBrandingCopy />;
  const badgeContent = badge ?? <EnterpriseShieldBadge className="mt-6" />;
  const lightLogoSrc = logoOnLightSrc ?? logoSrc;

  return (
    <div className="flex min-h-dvh">
      {!hideSidebar && (
        <div className="relative hidden min-h-dvh overflow-hidden bg-auth-teal lg:flex lg:w-[45%]">
          {bgSrc ? (
            <img
              src={bgSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : null}
          <div className="relative z-10 flex h-full w-full flex-col p-10 xl:p-14">
            <div>
              <a
                href={logoHref}
                className="inline-block rounded focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <img
                  src={logoSrc}
                  alt={logoAlt}
                  width={160}
                  height={50}
                  className="h-7 w-auto xl:h-8"
                />
              </a>
            </div>
            <div className="flex w-full flex-1 flex-col justify-end pt-8">
              {brandingContent}
              {badgeContent}
            </div>
          </div>
        </div>
      )}

      <div
        className={`flex w-full min-h-dvh items-center justify-center p-6 sm:p-10 ${hideSidebar ? "" : "lg:w-[55%]"} ${background} ${
          fillViewport
            ? "max-md:h-dvh max-md:max-h-dvh max-md:min-h-0 max-md:items-stretch max-md:overflow-hidden max-md:p-3 max-md:sm:p-3"
            : rightPanelOverflow
              ? "overflow-y-auto"
              : ""
        }`}
      >
        <div
          className={`w-full ${maxWidth} ${
            fillViewport
              ? "max-md:flex max-md:h-full max-md:min-h-0 max-md:flex-col max-md:space-y-0 max-md:overflow-hidden max-md:py-0"
              : "space-y-6 py-4"
          }`}
        >
          <div
            className={`${hideSidebar ? "flex" : "lg:hidden"} mb-6 ${fillViewport ? "max-md:hidden" : ""}`}
          >
            <a
              href={logoHref}
              className="inline-flex items-center rounded focus:outline-none focus:ring-2 focus:ring-focus-ring"
            >
              <img
                src={lightLogoSrc}
                alt={logoAlt}
                width={120}
                height={42}
                className="h-10 w-auto"
              />
            </a>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
