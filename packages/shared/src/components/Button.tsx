import { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const sizeClasses = {
  sm: "px-4 py-1.5 text-sm rounded",
  md: "px-6 py-2.5 text-base rounded-md",
  lg: "px-8 py-2.5 text-lg rounded-md",
} as const;

const variantClasses = {
  primary:
    "bg-gradient-to-r from-brand-primary-bright to-brand-accent-bright text-on-brand font-bold uppercase tracking-wider shadow-[inset_0_1px_0_rgba(0,0,0,0.1)] hover:opacity-95 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed",
  secondary:
    "bg-surface-subtle text-foreground font-semibold hover:bg-border-soft transition-colors disabled:opacity-70 disabled:cursor-not-allowed",
  outline:
    "border-2 border-border-strong bg-transparent text-foreground font-semibold hover:bg-surface-muted transition-colors disabled:opacity-70 disabled:cursor-not-allowed",
} as const;

export type ButtonSize = keyof typeof sizeClasses;
export type ButtonVariant = keyof typeof variantClasses;

/** Shared sized/variant button (`primary` | `secondary` | `outline`). */
export function Button({
  children,
  size,
  variant = "primary",
  type = "button",
  className = "",
  disabled,
  ...props
}: {
  children: ReactNode;
  size: ButtonSize;
  variant?: ButtonVariant;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={twMerge(
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
