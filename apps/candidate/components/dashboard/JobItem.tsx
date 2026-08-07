"use client";

import { Star } from "lucide-react";
import Image from "next/image";

interface JobItemProps {
    company: string;
    title: string;
    description: string;
    rating: number;
    reviews: number;
    tags: string[];
}

export function JobItem({
    title,
    description,
    rating,
    reviews,
    tags,
    company,
}: JobItemProps) {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-100 flex gap-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-lg overflow-hidden relative border border-gray-100">
                    <Image src="/company-intelizign.png" alt={company} fill className="object-cover" />
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <h4 className="font-bold text-gray-900 text-sm truncate">{title}</h4>
                </div>

                <p className="text-[11px] text-gray-500 mb-1.5 leading-snug line-clamp-2">{description}</p>

                <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center text-orange-400 bg-orange-50 px-1.5 py-0.5 rounded">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        <span className="text-[10px] font-bold ml-1 text-orange-600">{rating}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">| {reviews} reviews</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                        <span key={tag} className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded font-medium">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
            <div className="flex items-center justify-center pl-1">
                <button className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white px-3.5 py-1.5 rounded text-xs font-semibold transition-all shadow-sm hover:shadow-md whitespace-nowrap">
                    Apply
                </button>
            </div>
        </div>
    );
}
