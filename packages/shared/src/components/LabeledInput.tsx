import { InputHTMLAttributes, ReactNode } from "react";

const inputClassName =
  "w-full rounded-lg border border-border-default bg-surface px-4 py-2.5 text-foreground outline-none transition duration-200 placeholder:text-foreground-subtle hover:border-border-strong focus:border-focus-ring focus:shadow-input-focus";

/** Text input with associated label and optional non-interactive right icon. */
export function LabeledInput({
  id,
  label,
  type = "text",
  className = "",
  labelClassName = "",
  rightIcon,
  ...props
}: {
  id: string;
  label?: string;
  type?: string;
  labelClassName?: string;
  rightIcon?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        htmlFor={id}
        className={`mb-1.5 block text-sm font-medium text-foreground-muted ${labelClassName}`}
      >
        {label}
      </label>
      <div className={rightIcon ? "relative" : undefined}>
        <input
          id={id}
          type={type}
          className={`${inputClassName} ${rightIcon ? "pr-10" : ""} ${className}`}
          {...props}
        />
        {rightIcon && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground-subtle">
            {rightIcon}
          </span>
        )}
      </div>
    </div>
  );
}
