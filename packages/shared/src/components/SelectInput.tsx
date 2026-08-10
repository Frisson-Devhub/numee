import { SelectHTMLAttributes } from "react";

const selectClassName =
  "w-full cursor-pointer appearance-none rounded-lg border border-border-default bg-surface px-4 py-2.5 pr-10 text-foreground outline-none transition hover:border-border-strong focus:border-focus-ring focus:shadow-input-focus";

/** Labeled native `<select>` with a custom chevron affordance. */
export function SelectInput({
  id,
  label,
  children,
  className = "",
  ...props
}: {
  id: string;
  label: string;
  children: React.ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground-muted">
        {label}
      </label>
      <div className="relative">
        <select id={id} className={`${selectClassName} ${className}`} {...props}>
          {children}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground-subtle">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
    </div>
  );
}
