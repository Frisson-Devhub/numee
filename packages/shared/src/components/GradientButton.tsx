import { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

/**
 * Full-width gradient submit button with optional loading spinner.
 * Disables the control while `loading` is true.
 */
export function GradientButton({
  children,
  type = "submit",
  className = "",
  loading = false,
  ...props
}: {
  children: React.ReactNode;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      disabled={loading || props.disabled}
      className={`relative w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-amber-500 hover:from-blue-600 hover:to-amber-600 cursor-pointer transition shadow-md disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      <span className={`flex items-center justify-center gap-2 ${loading ? "invisible" : ""}`}>
        {children}
      </span>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner className="w-5 h-5 text-white" />
        </div>
      )}
    </button>
  );
}
