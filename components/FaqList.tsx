"use client";

import { useState } from "react";
import type { Faq } from "@/lib/faq";

/** Accordion of questions. The first one starts open. */
export default function FaqList({ items }: { items: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="flex flex-col">
      {items.map((f, i) => {
        const isOpen = open === i;
        const id = `faq-${i}`;
        return (
          <div key={f.question} className="border-t border-line">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={id}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full cursor-pointer items-center justify-between gap-6 border-0 bg-transparent py-[26px] text-left font-serif text-[clamp(22px,2.3vw,32px)] leading-[1.2] text-ink transition-colors hover:text-bronze"
            >
              <span>{f.question}</span>
              <span className="flex h-8 w-8 flex-none items-center justify-center border border-ink/40 font-sans text-base">
                {isOpen ? "–" : "+"}
              </span>
            </button>
            {isOpen && (
              <p id={id} className="copy mb-7 mr-14 max-w-[620px]">{f.answer}</p>
            )}
          </div>
        );
      })}
      <div className="border-t border-line" />
    </div>
  );
}
