import type { ReactNode } from "react";

/**
 * Restrained security / context note for auth forms.
 * Square mark + soft tint — avoids pill chips and emoji-style callouts.
 */
export function AuthCallout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border-default bg-surface-muted px-3.5 py-3.5 shadow-sm">
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-primary text-xs font-bold text-on-brand"
        aria-hidden
      >
        i
      </div>
      <p className="text-sm leading-relaxed text-foreground-muted">
        <span className="font-semibold text-foreground">{title}</span> {children}
      </p>
    </div>
  );
}
