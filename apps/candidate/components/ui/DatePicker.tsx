"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarIcon } from "./CalendarIcon";

interface DatePickerProps {
    id: string;
    label: string;
    value: string; // format: mm/dd/yyyy or yyyy-mm-dd
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
}

const inputClassName =
    "w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-700 bg-white";

export function DatePicker({
    id,
    label,
    value,
    onChange,
    placeholder = "dd/mm/yyyy",
    required = false,
    className = "",
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize view date from value
    const [lastValue, setLastValue] = useState(value);
    if (value !== lastValue) {
        setLastValue(value);
        if (value) {
            // Try to parse dd/mm/yyyy
            const parts = value.split('/');
            let d: Date;
            if (parts.length === 3) {
                // dd/mm/yyyy -> new Date(yyyy, mm-1, dd)
                d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            } else {
                d = new Date(value);
            }
            if (!isNaN(d.getTime())) {
                setViewDate(d);
            }
        }
    }

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const startDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDateSelect = (day: number) => {
        const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        // Format as dd/mm/yyyy
        const formatted = `${String(selectedDate.getDate()).padStart(2, '0')}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${selectedDate.getFullYear()}`;
        onChange(formatted);
        setIsOpen(false);
    };

    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 100; i--) {
        years.push(i);
    }

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days = [];
    const totalDays = daysInMonth(year, month);
    const startDay = startDayOfMonth(year, month);

    // Padding for start of month
    for (let i = 0; i < startDay; i++) {
        days.push(null);
    }
    // Days of month
    for (let i = 1; i <= totalDays; i++) {
        days.push(i);
    }

    const isSelected = (day: number) => {
        if (!value) return false;
        const parts = value.split('/');
        let d: Date;
        if (parts.length === 3) {
            d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        } else {
            d = new Date(value);
        }
        return !isNaN(d.getTime()) &&
            d.getDate() === day &&
            d.getMonth() === month &&
            d.getFullYear() === year;
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type="text"
                    readOnly
                    onClick={() => setIsOpen(!isOpen)}
                    placeholder={placeholder}
                    value={value}
                    className={`${inputClassName} cursor-pointer pr-10`}
                    required={required}
                />
                <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <CalendarIcon />
                </span>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 animate-in fade-in zoom-in duration-200 origin-top-left">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-600"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div className="flex gap-1 font-semibold text-gray-700">
                            <span>{months[month]}</span>
                            <span>{year}</span>
                        </div>

                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-600"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                            <span key={d} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{d}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, i) => (
                            <div key={i} className="aspect-square flex items-center justify-center">
                                {day !== null ? (
                                    <button
                                        type="button"
                                        onClick={() => handleDateSelect(day)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition
                                            ${isSelected(day)
                                                ? "bg-blue-600 text-white font-semibold"
                                                : "text-gray-600 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                                            }`}
                                    >
                                        {day}
                                    </button>
                                ) : (
                                    <div className="w-8 h-8" />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <select
                            value={year}
                            onChange={(e) => setViewDate(new Date(parseInt(e.target.value), month, 1))}
                            className="text-xs border-none bg-transparent font-medium text-gray-500 focus:ring-0 cursor-pointer hover:text-blue-600"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button
                            type="button"
                            onClick={() => {
                                const today = new Date();
                                setViewDate(today);
                                handleDateSelect(today.getDate());
                            }}
                            className="text-xs font-bold text-blue-600 hover:underline"
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
