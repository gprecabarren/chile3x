import Image from "next/image";

export function OfficialChile3xLogo({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return <Image
    className={`official-chile3x-logo${className ? ` ${className}` : ""}`}
    src="/chile3x-logo-primary.jpeg"
    alt="Chile3X"
    width={800}
    height={225}
    priority={priority}
    unoptimized
  />;
}
