import Image from "next/image";
import { brandName } from "@/lib/config";

/**
 * The brand wordmark, from the supplied artwork.
 *
 * The mark is a bitmap, not type, so it cannot take a CSS colour: there is one
 * file per ground, each carrying the theme's own ink (#111113) or bone
 * (#F2F1EE). The M of the lockup is not here — it carries the site icon, where
 * a wordmark this wide cannot read.
 *
 * Widths stand on the 11px rhythm the rest of the header chrome uses.
 */
export default function LogoMark({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <Image
      className="h-auto w-[176px] md:w-[198px]"
      src={tone === "light" ? "/images/logo-wordmark-ink.png" : "/images/logo-wordmark-bone.png"}
      alt={brandName}
      width={1370}
      height={100}
      sizes="198px"
    />
  );
}
