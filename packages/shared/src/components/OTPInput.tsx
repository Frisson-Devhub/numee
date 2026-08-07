"use client";

import { useRef, useCallback, KeyboardEvent, ClipboardEvent } from "react";

const inputClassName =
  "w-11 h-11 sm:w-12 sm:h-12 text-center text-lg font-semibold rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-700";

/**
 * Multi-box numeric OTP entry with paste and arrow/backspace navigation.
 * Emits a digits-only string of at most `length`.
 */
export function OTPInput({
  id,
  label,
  length = 6,
  value,
  onChange,
  placeholder = "0",
  className = "",
}: {
  id: string;
  label: string;
  length?: number;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const raw = value.replace(/\D/g, "").slice(0, length).split("");
  const digits = Array.from({ length }, (_, i) => raw[i] ?? "");

  const setDigit = useCallback(
    (index: number, char: string) => {
      const digit = char.replace(/\D/g, "").slice(-1);
      const next = [...digits];
      next[index] = digit;
      onChange(next.join("").slice(0, length));

      if (digit && index < length - 1) {
        refs.current[index + 1]?.focus();
      }
    },
    [value, length, onChange, digits]
  );

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
      setDigit(index - 1, "");
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    const nextIndex = Math.min(pasted.length, length - 1);
    refs.current[nextIndex]?.focus();
  };

  return (
    <div className={`${className}`}>
      <label htmlFor={`${id}-0`} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex justify-between">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            id={i === 0 ? id : `${id}-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            autoComplete="one-time-code"
            value={digits[i] ?? ""}
            placeholder={placeholder}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`${inputClassName} sm:w-17`}
            aria-label={`${label} digit ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
