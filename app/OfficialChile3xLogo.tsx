import Image from "next/image";

export function OfficialChile3xLogo({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return <Image
    className={`official-chile3x-logo${className ? ` ${className}` : ""}`}
    src="/assets/chile3x-logo-primary-320-20260923.webp"
    alt="Chile3X"
    width={320}
    height={112}
    priority={priority}
    unoptimized
  />;
}
