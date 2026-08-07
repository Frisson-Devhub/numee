"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { Menu, User, Briefcase, Building2 } from "lucide-react";
import { recruiterRoutes } from "@/constants/frontendRoutes";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [dropdownOpen]);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-default bg-surface px-4 shadow-sm sm:px-6">
      <button
        type="button"
        className="text-foreground-subtle hover:text-foreground cursor-pointer"
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      <div className="flex items-center gap-4">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDropdownOpen((v) => !v);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-foreground-muted hover:bg-border-default transition-colors cursor-pointer"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <User className="h-5 w-5" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-border-default bg-surface py-1 shadow-md">
              <Link
                href={recruiterRoutes.settings}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground-muted hover:bg-surface-muted"
              >
                <User className="h-4 w-4" />
                Account
              </Link>
              <Link
                href={recruiterRoutes.company}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground-muted hover:bg-surface-muted"
              >
                <Building2 className="h-4 w-4" />
                Company
              </Link>
              <Link
                href={recruiterRoutes.jobs}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground-muted hover:bg-surface-muted"
              >
                <Briefcase className="h-4 w-4" />
                Jobs
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
