import { InputHTMLAttributes, ReactNode } from "react";

const inputClassName =
  "w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-700";

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
      <label htmlFor={id} className={`block text-sm font-medium text-gray-700 mb-1.5 ${labelClassName}`}>
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
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
    </div>
  );
}
