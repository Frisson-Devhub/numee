import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Numee Recruiter",
  description: "Numee recruiter portal",
  icons: { icon: "/favicon.png" },
};

/**
 * Root shell. `data-portal="recruiter"` scopes shared brand/focus tokens to the
 * login teal palette so dashboard chrome matches AuthShell.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-portal="recruiter">
      <body className={`${plusJakarta.variable} antialiased font-sans`}>
        {children}
      </body>
    </html>
  );
}
