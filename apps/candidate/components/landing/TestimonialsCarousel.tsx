"use client";

import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ImageViewer } from "@/components/ui/ImageViewer";
import type { TestimonialItem } from "@/constants/testimonials";

export type { TestimonialItem };

type TestimonialsCarouselProps = {
    items: TestimonialItem[];
};

export function TestimonialsCarousel({ items }: TestimonialsCarouselProps) {
    const count = items.length;
    const [index, setIndex] = useState(0);

    const goTo = useCallback(
        (next: number) => {
            if (count === 0) return;
            setIndex(((next % count) + count) % count);
        },
        [count]
    );

    if (count === 0) return null;

    const current = items[index];

    return (
        <div className="bg-slate-50 rounded-2xl p-8 lg:p-12 border border-slate-200">
            <div
                key={index}
                className="flex flex-col items-center gap-8 md:flex-row animate-testimonial-enter"
            >
                <div className="relative shrink-0">
                    <ImageViewer
                        src={current.avatar}
                        alt={current.name}
                        width={96}
                        height={96}
                        className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-lg"
                    />
                    <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full border-2 border-white bg-teal-400" />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <blockquote className="mb-6 text-xl leading-relaxed text-slate-700 lg:text-2xl">
                        &ldquo;{current.quote}&rdquo;
                    </blockquote>
                    <div>
                        <p className="font-bold text-blue-900">{current.name}</p>
                        <p className="text-sm text-blue-700">{current.title}</p>
                    </div>
                </div>
            </div>
            <div className="mt-8 flex flex-col items-center justify-center gap-4">
                <div className="flex gap-3">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label="Previous testimonial"
                        className="flex h-10 w-10 min-w-0 items-center justify-center rounded-full border-slate-300 p-0 text-slate-600 hover:bg-slate-100 cursor-pointer"
                        onClick={() => goTo(index - 1)}
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label="Next testimonial"
                        className="flex h-10 w-10 min-w-0 items-center justify-center rounded-full border-slate-300 p-0 text-slate-600 hover:bg-slate-100 cursor-pointer"
                        onClick={() => goTo(index + 1)}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
                <div className="flex gap-2">
                    {items.map((_, i) => (
                        <Button
                            key={i}
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={`Go to testimonial ${i + 1}`}
                            aria-current={i === index ? "true" : undefined}
                            className={`h-2.5 w-4 min-w-0 shrink-0 rounded-full border-0 p-0 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                                i === index
                                    ? "bg-blue-600 hover:bg-blue-700"
                                    : "bg-slate-300 hover:bg-slate-400"
                            }`}
                            onClick={() => goTo(i)}
                        >
                            {null}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}
