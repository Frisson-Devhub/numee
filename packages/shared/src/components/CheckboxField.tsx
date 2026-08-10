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
      className={`flex cursor-pointer gap-2.5 ${alignTop ? "items-start" : "items-center"} ${labelClassName}`}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        className={`h-4 w-4 shrink-0 rounded border-border-default text-brand-primary focus:ring-focus-ring ${alignTop ? "mt-0.5" : ""} ${className}`}
        {...props}
      />
      <span className="text-sm text-foreground-muted">{label}</span>
    </label>
  );
}
