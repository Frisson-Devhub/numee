import { twMerge } from "tailwind-merge";

const badgeBase =
  "flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/5 w-fit";

/** Compact “Protected by Enterprise Shield” badge for auth branding panels. */
export function EnterpriseShieldBadge({ className }: { className?: string }) {
  return (
    <div className={twMerge(badgeBase, className)}>
      <svg className="w-5 h-5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
      <span className="text-sm font-medium text-white">Protected by Enterprise Shield</span>
    </div>
  );
}
