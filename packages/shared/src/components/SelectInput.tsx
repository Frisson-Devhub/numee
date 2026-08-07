import { SelectHTMLAttributes } from "react";

const selectClassName =
  "w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition appearance-none bg-white cursor-pointer";

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
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <select id={id} className={`${selectClassName} ${className}`} {...props}>
          {children}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
    </div>
  );
}
