"use client";

/**
 * Brand-first marketing copy for desktop auth sidebar and mobile auth header.
 * Product name leads; headline and body stay secondary so the composition stays branded.
 */
export function AuthBrandingCopy({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full space-y-5 ${className}`.trim()}>
      <h1 className="text-4xl font-semibold tracking-tight text-auth-on-panel xl:text-5xl">
        NuMee
      </h1>
      <p className="max-w-md text-xl font-medium leading-snug tracking-tight text-auth-on-panel xl:text-2xl">
        Mentorship that scales with enterprise trust
      </p>
      <p className="max-w-sm text-sm leading-relaxed text-auth-on-panel-muted xl:text-base">
        Orchestrate mentorship connections with AI-guided workflows and security built for regulated teams.
      </p>
    </div>
  );
}
