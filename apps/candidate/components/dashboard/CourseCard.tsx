"use client";

import { Clock, BookOpen } from "lucide-react";
import Image from "next/image";

interface CourseCardProps {
    title: string;
    description: string;
    originalPrice: number;
    price: number;
    lessons: number;
    duration: string;
    image: string;
}

export function CourseCard({
    title,
    description,
    price,
    originalPrice,
    lessons,
    duration,
    image,
}: CourseCardProps) {
    return (
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col h-full translate-y-0 hover:-translate-y-1 transition-transform duration-300">
            <div className="relative h-44 w-full">
                <Image src={image} alt={title} fill className="object-cover" />
            </div>
            <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-gray-900 mb-1 leading-tight">{title}</h3>
                <p className="text-gray-500 text-[11px] mb-3 leading-relaxed line-clamp-2">{description}</p>

                <div className="flex items-center gap-4 text-[10px] text-gray-400 mb-3 mt-auto font-medium">
                    <div className="flex items-center gap-1.5">
                        <BookOpen className="h-3 w-3" />
                        <span>{lessons} Lessons</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>{duration}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-gray-800">${price}</span>
                        <span className="text-xs text-slate-400 line-through decoration-slate-400">${originalPrice}</span>
                    </div>
                    <button className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white px-5 py-1.5 rounded text-xs font-semibold transition-all shadow-sm hover:shadow-md">
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}
