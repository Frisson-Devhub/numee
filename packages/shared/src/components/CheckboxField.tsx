import { InputHTMLAttributes } from "react";

/** Checkbox + label row; use `alignTop` when the label wraps to multiple lines. */
export function CheckboxField({
  id,
  checked,
  onChange,
  label,
  labelClassName = "",
  className = "",
  alignTop = false,
  ...props
}: {
  id: string;
  label: React.ReactNode;
  labelClassName?: string;
  alignTop?: boolean;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={`flex gap-2 cursor-pointer ${alignTop ? "items-start" : "items-center"} ${labelClassName}`}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0 ${alignTop ? "mt-0.5" : ""} ${className}`}
        {...props}
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
