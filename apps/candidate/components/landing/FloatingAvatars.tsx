"use client";

import Image from "next/image";

const avatars = [
    {
        id: 1,
        url: "https://images.unsplash.com/photo-1573161158365-59b81ef745c1?q=80&w=200&h=200&auto=format&fit=crop",
        style: { top: "5%", right: "35%", width: "120px", height: "120px" },
        label: "Engineer"
    },
    {
        id: 2,
        url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&h=200&auto=format&fit=crop",
        style: { top: "25%", right: "45%", width: "110px", height: "110px" },
        label: "Executive"
    },
    {
        id: 3,
        url: "https://images.unsplash.com/photo-1603969409447-ba86143a03f6?q=80&w=200&h=200&auto=format&fit=crop",
        style: { top: "45%", right: "48%", width: "115px", height: "115px" },
        label: "Developer"
    },
    {
        id: 4,
        url: "https://images.unsplash.com/photo-1581299894007-aaa50297cf16?q=80&w=200&h=200&auto=format&fit=crop",
        style: { bottom: "15%", right: "42%", width: "110px", height: "110px" },
        label: "Chef"
    },
    {
        id: 5,
        url: "https://images.unsplash.com/photo-1554080353-a576cf803bda?q=80&w=200&h=200&auto=format&fit=crop",
        style: { bottom: "0%", right: "35%", width: "110px", height: "110px" },
        label: "Photographer"
    }
];

export default function FloatingAvatars() {
    return (
        <div className="absolute inset-0 z-10 pointer-events-none">
            {avatars.map((avatar) => (
                <div
                    key={avatar.id}
                    className="absolute rounded-full border-4 border-white/20 shadow-2xl overflow-hidden animate-float"
                    style={{
                        ...avatar.style,
                        animationDelay: `${avatar.id * 0.5}s`,
                        animationDuration: `${5 + avatar.id}s`
                    }}
                >
                    <Image
                        src={avatar.url}
                        alt={avatar.label}
                        fill
                        className="object-cover"
                    />
                </div>
            ))}
        </div>
    );
}
