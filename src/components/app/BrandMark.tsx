import logoMark from "@/assets/logo-mark.png";
import { cn } from "@/lib/utils";

/** Símbolo circular da marca (sem a tipografia do logo completo). */
export function BrandMark({
  className,
  size = 44,
  alt = "Recanto das Águas",
}: {
  className?: string;
  size?: number;
  alt?: string;
}) {
  return (
    <img
      src={logoMark}
      alt={alt}
      width={size}
      height={size}
      decoding="async"
      draggable={false}
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
