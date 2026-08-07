"use client";

/**
 * Shared marketing headline + body used on desktop auth sidebar and mobile auth header.
 */
export function AuthBrandingCopy({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-4 w-full ${className}`.trim()}>
      <h1 className="text-[16px] lg:text-3xl font-semibold lg:font-bold text-white leading-tight w-full">
        Secure & Scalable Mentorship Management
      </h1>
      <p className="text-white/90 text-[12px] lg:text-base leading-relaxed max-w-md">
        Orchestrate thousands of mentorship connections with our AI-powered engine. Enterprise-grade security keeps
        your data safe.
      </p>
    </div>
  );
}
