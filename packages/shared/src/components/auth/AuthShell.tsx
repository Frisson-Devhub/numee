"use client";

import type { ReactNode } from "react";
import { AuthBrandingCopy } from "./AuthBrandingCopy";
import { EnterpriseShieldBadge } from "./EnterpriseShieldBadge";

/** Portal accent for the left branding panel (candidate blue / recruiter teal / admin charcoal). */
export type AuthShellPortal = "candidate" | "recruiter" | "admin";

const PORTAL_PANEL_CLASS: Record<AuthShellPortal, string> = {
  candidate: "bg-auth-navy",
  recruiter: "bg-auth-teal",
  admin: "bg-auth-charcoal",
};

const PORTAL_LABEL: Record<AuthShellPortal, string> = {
  candidate: "Candidate portal",
  recruiter: "Recruiter portal",
  admin: "Admin portal",
};

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
  /**
   * Portal-distinct left-panel accent. Defaults to recruiter teal for backward compatibility.
   * Also sets `data-auth-portal` so brand/focus tokens match the portal.
   */
  portal?: AuthShellPortal;
};

/**
 * Framework-agnostic auth layout: branding panel + form column.
 * Brand wordmark is the hero signal on the left; form column is the interaction surface.
 * Uses plain `<img>` / `<a>` so apps can inject Next-optimized assets via src props.
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
  background = "bg-surface-muted",
  fillViewport = false,
  branding,
  badge,
  portal = "recruiter",
}: AuthShellProps) {
  const brandingContent = branding ?? <AuthBrandingCopy />;
  const badgeContent = badge ?? <EnterpriseShieldBadge className="mt-8" />;
  const lightLogoSrc = logoOnLightSrc ?? logoSrc;
  const panelClass = PORTAL_PANEL_CLASS[portal];

  return (
    <div
      className="flex min-h-dvh font-sans text-foreground"
      data-auth-portal={portal}
    >
      {!hideSidebar && (
        <div
          className={`relative hidden min-h-dvh overflow-hidden text-auth-on-panel lg:flex lg:w-[46%] xl:w-[48%] ${panelClass}`}
        >
          {bgSrc ? (
            <img
              src={bgSrc}
              alt=""
              className="absolute inset-0 h-full w-full scale-105 object-cover object-center opacity-50"
            />
          ) : null}

          {/* Atmospheric layers: vignette + soft accent wash (not flat color) */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `
                linear-gradient(165deg, var(--auth-overlay-top) 0%, transparent 42%, var(--auth-overlay-bottom) 100%),
                radial-gradient(ellipse 80% 55% at 20% 15%, color-mix(in srgb, var(--auth-panel-accent) 28%, transparent), transparent 70%),
                radial-gradient(ellipse 60% 40% at 85% 80%, color-mix(in srgb, var(--auth-panel-accent) 12%, transparent), transparent 65%)
              `,
            }}
          />
          <div
            className="auth-panel-sheen pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage: `
                linear-gradient(115deg, transparent 40%, color-mix(in srgb, var(--auth-panel-accent) 8%, transparent) 50%, transparent 60%)
              `,
            }}
          />
          {/* Fine grid texture for depth */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)
              `,
              backgroundSize: "48px 48px",
              maskImage: "linear-gradient(to bottom, black 0%, transparent 75%)",
            }}
          />

          <div className="relative z-10 flex h-full w-full flex-col p-10 xl:p-14">
            <div className="auth-animate-fade">
              <a
                href={logoHref}
                className="inline-block rounded-md focus:outline-none focus:ring-2 focus:ring-auth-on-panel/45"
              >
                <img
                  src={logoSrc}
                  alt={logoAlt}
                  width={200}
                  height={62}
                  className="h-9 w-auto xl:h-10"
                />
              </a>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-auth-on-panel-subtle">
                {PORTAL_LABEL[portal]}
              </p>
            </div>
            <div className="flex w-full flex-1 flex-col justify-end pt-10">
              <div className="auth-animate-rise mb-1 h-0.5 w-12 bg-auth-panel-accent" />
              <div className="auth-animate-rise-delay">
                {brandingContent}
                {badgeContent}
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`relative flex w-full min-h-dvh items-center justify-center p-6 text-foreground sm:p-10 ${hideSidebar ? "" : "lg:w-[54%] xl:w-[52%]"} ${background} ${
          fillViewport
            ? "max-md:h-dvh max-md:max-h-dvh max-md:min-h-0 max-md:items-stretch max-md:overflow-hidden max-md:p-3 max-md:sm:p-3"
            : rightPanelOverflow
              ? "overflow-y-auto"
              : ""
        }`}
      >
        {/* Soft form-column atmosphere */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 50% at 50% 0%, var(--auth-form-glow), transparent 60%),
              linear-gradient(180deg, var(--surface-muted) 0%, var(--surface) 45%, var(--surface-muted) 100%)
            `,
          }}
        />
        <div
          className={`relative z-10 w-full ${maxWidth} ${
            fillViewport
              ? "max-md:flex max-md:h-full max-md:min-h-0 max-md:flex-col max-md:space-y-0 max-md:overflow-hidden max-md:py-0"
              : "space-y-7 py-4"
          } ${fillViewport ? "" : "auth-animate-form"}`}
        >
          <div
            className={`${hideSidebar ? "flex" : "lg:hidden"} mb-6 ${fillViewport ? "max-md:hidden" : ""}`}
          >
            <a
              href={logoHref}
              className="inline-flex items-center rounded-md focus:outline-none focus:ring-2 focus:ring-focus-ring"
            >
              <img
                src={lightLogoSrc}
                alt={logoAlt}
                width={140}
                height={48}
                className="h-9 w-auto sm:h-10"
              />
            </a>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
