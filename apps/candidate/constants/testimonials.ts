export type TestimonialItem = {
    quote: string;
    name: string;
    title: string;
    avatar: string;
};

export type TestimonialsData = {
    items: TestimonialItem[];
};

/** Landing page testimonials — add entries inside `items`. */
export const testimonials: TestimonialsData = {
    items: [
        {
            quote: "NuMee transformed my career path. The personalized roadmap and AI mentor helped me move from uncertainty to a clear plan—and I landed my dream role within six months.",
            name: "John Doe",
            title: "Software Engineer",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&h=200&auto=format&fit=crop",
        },
        {
            quote: "The skill assessments were eye-opening—I finally knew where I stood. My mentor sessions kept me on track, and I switched careers with a roadmap that felt realistic, not overwhelming.",
            name: "Sarah Chen",
            title: "Product Designer",
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&h=200&auto=format&fit=crop",
        },
    ],
};
