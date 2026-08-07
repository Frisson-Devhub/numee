"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Menu, User, Briefcase, Mail } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
    const { t } = useI18n();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        if (dropdownOpen) {
            document.addEventListener("click", handleClickOutside);
        }
        return () => document.removeEventListener("click", handleClickOutside);
    }, [dropdownOpen]);

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6">
            <button
                type="button"
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
                onClick={onMenuClick}
            >
                <Menu className="h-6 w-6" />
            </button>

            <div className="flex items-center gap-4">
                {/* <button className="relative rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 cursor-pointer">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                </button> */}

                <div className="relative" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDropdownOpen((v) => !v);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors cursor-pointer"
                        aria-expanded={dropdownOpen}
                        aria-haspopup="true"
                    >
                        <User className="h-5 w-5 " />
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                            <Link
                                href="/user/profile"
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <User className="h-4 w-4" />
                                {t("header.viewProfile")}
                            </Link>
                            <Link
                                href="/user/jobs"
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <Briefcase className="h-4 w-4" />
                                {t("header.careers")}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
