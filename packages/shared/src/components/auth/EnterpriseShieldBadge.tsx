import { twMerge } from "tailwind-merge";

const badgeBase =
  "inline-flex items-center gap-2.5 rounded-md border border-auth-on-panel/20 bg-auth-on-panel/[0.08] px-3.5 py-2 w-fit backdrop-blur-[2px]";

/** Compact trust mark for auth branding panels — restrained, not a pill chip. */
export function EnterpriseShieldBadge({ className }: { className?: string }) {
  return (
    <div className={twMerge(badgeBase, className)}>
      <svg
        className="h-4 w-4 shrink-0 text-auth-panel-accent"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
      <span className="text-xs font-medium tracking-wide text-auth-on-panel-muted">
        Protected by Enterprise Shield
      </span>
    </div>
  );
}
