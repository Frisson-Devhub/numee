import { ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";
import { Spinner } from "./Spinner";

/**
 * Full-width primary CTA with optional loading spinner.
 * Gradient and focus ring use brand tokens (portal-scoped inside AuthShell).
 * Pass `className` to tune width/padding; it merges over the defaults.
 */
export function GradientButton({
  children,
  type = "submit",
  className = "",
  loading = false,
  disabled,
  ...props
}: {
  children: React.ReactNode;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const isDisabled = Boolean(loading || disabled);

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={twMerge(
        "relative w-full cursor-pointer rounded-lg bg-gradient-to-b from-brand-primary-bright to-brand-primary px-5 py-3 font-semibold text-on-brand shadow-button transition duration-200 hover:from-brand-primary hover:to-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
      {...props}
    >
      <span
        className={twMerge(
          "flex items-center justify-center gap-2",
          loading && "invisible",
        )}
      >
        {children}
      </span>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner className="h-5 w-5 text-on-brand" />
        </div>
      )}
    </button>
  );
}
