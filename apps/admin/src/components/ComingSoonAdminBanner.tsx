import { useEffect, useState } from "react";

function ComingSoonDots() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveIndex((i) => (i + 1) % 3), 400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-center gap-2 my-6" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full transition-colors duration-300 ${
            i === activeIndex ? "bg-on-brand" : "bg-on-brand/35"
          }`}
        />
      ))}
    </div>
  );
}

export function ComingSoonAdminBanner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] rounded-xl text-center px-6 bg-linear-to-br from-blue-500 to-orange-500 relative overflow-hidden">
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-on-brand sm:text-6xl">
        Good things take a little time!
      </h1>
      <h2 className="mt-1 text-3xl font-bold tracking-tight text-on-brand/95 sm:text-5xl">
        Your data is being prepared.
      </h2>
      <ComingSoonDots />
      <p className="max-w-md text-sm font-normal text-on-brand/85 sm:text-base">
        You will be soon notified for it.
      </p>
    </div>
  );
}
