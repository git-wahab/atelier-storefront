import Image from "next/image";

/**
 * A photograph on a dark plate. The box sets the shape; the image fills it.
 * `plain` shows white-ground artwork on a light panel, uncropped.
 */
export default function Photo({
  src,
  alt,
  ratio = "4/5",
  position = "50% 25%",
  plain = false,
  sizes = "(max-width: 860px) 100vw, 50vw",
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  ratio?: string;
  position?: string;
  plain?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (plain) {
    return (
      <div
        className={`relative max-w-full border border-line bg-paper ${className}`}
        style={{ aspectRatio: ratio }}
      >
        <Image src={src} alt={alt} fill sizes={sizes} className="object-contain p-6" />
      </div>
    );
  }
  return (
    <div className={`frame max-w-full ${className}`} style={{ aspectRatio: ratio }}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectPosition: position }} />
    </div>
  );
}
