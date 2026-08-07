import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/numee-logo.png";

export function NuMeeLogo({
  size = "md",
  href = "/",
}: {
  gradientId?: string;
  size?: "sm" | "md";
  href?: string;
  showIcon?: boolean;
}) {
  const heightClass = size === "sm" ? "h-6" : "h-8";
  return (
    <Link href={href} className="inline-flex items-center">
      <Image
        src={LOGO_SRC}
        alt="NuMee"
        width={120}
        height={40}
        className={`${heightClass} w-auto`}
        priority
      />
    </Link>
  );
}
