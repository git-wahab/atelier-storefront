"use client";

import Image from "next/image";
import { useState } from "react";
import type { Img } from "@/lib/products";

/** Large image with a row of thumbnails that swap it. */
export default function ProductGallery({ images }: { images: Img[] }) {
  const [sel, setSel] = useState(0);
  const main = images[sel];
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="frame max-w-full" style={{ aspectRatio: "4/5" }}>
        <Image key={main.src} src={main.src} alt={main.alt} fill priority sizes="(max-width: 860px) 100vw, 55vw" style={{ objectPosition: main.position ?? "50% 25%" }} />
      </div>
      <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${images.length}, minmax(0, 1fr))` }}>
        {images.map((im, i) => (
          <button
            key={im.src}
            type="button"
            aria-label={im.alt}
            aria-pressed={i === sel}
            onClick={() => setSel(i)}
            className={`relative aspect-square cursor-pointer overflow-hidden border bg-plate p-0 transition ${
              i === sel ? "border-ink opacity-100" : "border-ink/20 opacity-60 hover:opacity-90"
            }`}
          >
            <Image src={im.src} alt="" fill sizes="96px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
