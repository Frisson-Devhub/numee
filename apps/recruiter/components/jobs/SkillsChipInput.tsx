"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

function parseSkills(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function serializeSkills(skills: string[]): string {
  return skills.join(", ");
}

/**
 * Chip UI over a comma-separated string (Formik `skillsText`). Enter/comma adds;
 * Backspace on empty draft removes the last chip. Dedupes case-insensitively.
 */
export function SkillsChipInput({
  id,
  value,
  onChange,
  disabled,
  placeholder = "Type a skill and press Enter",
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const skills = parseSkills(value);

  const addSkill = (raw: string) => {
    const next = raw.trim().replace(/,/g, "");
    if (!next) return;
    const exists = skills.some(
      (s) => s.toLowerCase() === next.toLowerCase(),
    );
    if (exists) {
      setDraft("");
      return;
    }
    onChange(serializeSkills([...skills, next]));
    setDraft("");
  };

  const removeSkill = (skill: string) => {
    onChange(serializeSkills(skills.filter((s) => s !== skill)));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(draft);
      return;
    }
    if (e.key === "Backspace" && !draft && skills.length) {
      removeSkill(skills[skills.length - 1]!);
    }
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-foreground-muted mb-1.5"
      >
        Required skills
      </label>
      <div
        className={`flex min-h-[2.75rem] flex-wrap items-center gap-2 rounded-lg border border-border-default bg-surface px-3 py-2 transition focus-within:ring-2 focus-within:ring-focus-ring ${
          disabled ? "opacity-60" : ""
        }`}
      >
        {skills.map((skill) => (
          <span
            key={skill}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-brand-primary/10 px-2.5 py-1 text-sm font-medium text-brand-primary"
          >
            <span className="truncate">{skill}</span>
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ${skill}`}
                onClick={() => removeSkill(skill)}
                className="inline-flex shrink-0 rounded p-0.5 text-brand-primary/70 transition hover:bg-brand-primary/15 hover:text-brand-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          disabled={disabled}
          placeholder={skills.length ? "Add another…" : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) addSkill(draft);
          }}
          className="min-w-[10rem] flex-1 border-0 bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-foreground-subtle disabled:cursor-not-allowed"
        />
      </div>
      <p className="mt-1.5 text-xs text-foreground-subtle">
        Press Enter or comma to add. Click × to remove.
      </p>
    </div>
  );
}
