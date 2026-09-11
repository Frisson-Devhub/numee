import { LandingStyles } from "@/components/landing/LandingStyles";

/**
 * Landing-only chrome. The legacy callnumee stylesheets (Bootstrap + Poppins) reset
 * element styles and fight the Tailwind product chrome, so they must not outlive this
 * segment. `LandingStyles` renders them as lifecycle-bound `<link>` tags here rather
 * than importing the CSS or using `<link precedence>`: React caches precedence-hoisted
 * stylesheets — and Next keeps route CSS chunks — in the document forever, which leaked
 * Bootstrap into `/login` and the dashboard on client-side navigation.
 */
export default function LandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <LandingStyles />
      {children}
    </>
  );
}
