"use client";

import { useRef, useState, useCallback } from "react";

const iconClass = "w-10 h-10 text-sky-500 shrink-0";

function DocumentIcon() {
  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

/**
 * Drag-and-drop / click file picker for PDF/DOC uploads.
 * `variant` switches the decorative icon (`document` | `resume`).
 */
export function FileDropZone({
  id,
  label,
  variant = "document",
  accept = ".pdf,.doc,.docx",
  onChange,
  className = "",
  disabled = false,
}: {
  id: string;
  label: string;
  variant?: "document" | "resume";
  accept?: string;
  onChange?: (files: FileList | null) => void;
  className?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.files ?? null);
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setIsDragging(true);
    },
    [disabled]
  );
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;
      const files = e.dataTransfer.files;
      if (files.length) onChange?.(files);
    },
    [onChange, disabled]
  );

  const Icon = variant === "resume" ? ResumeIcon : DocumentIcon;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => !disabled && e.key === "Enter" && handleClick()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-disabled={disabled}
      className={`
        flex items-center gap-4 p-4 rounded-lg border-2 border-dashed border-gray-300
        bg-gray-50/50 transition
        ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-sky-400 hover:bg-sky-50/30"}
        ${isDragging && !disabled ? "border-sky-400 bg-sky-50/50" : ""}
        ${className}
      `}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
      />
      <Icon />
      <div className="flex-1 min-w-0">
        <p className="text-gray-800 font-medium">
          Drag & Drop {label}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">
          in PDF or DOC format here or{" "}
          <span className="text-blue-600 font-medium hover:text-blue-700">Choose file</span>
        </p>
      </div>
    </div>
  );
}
