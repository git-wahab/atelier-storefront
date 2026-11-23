"use client";

import Link from "next/link";
import { useState } from "react";
import { MAX_CART_LINES, MAX_LINE_QTY } from "@/lib/api";
import { useCart, type AddResult } from "@/lib/cart";
import { money, notes, priceOf, sizes } from "@/lib/config";
import type { Product } from "@/lib/products";

/** Name, price, size choice, add to cart and the details accordion. */
export default function ProductBuy({ product }: { product: Product }) {
  const { add, count } = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [needSize, setNeedSize] = useState(false);
  const [added, setAdded] = useState(false);
  /** Set when the cart refused the line, so the shopper hears why. */
  const [refused, setRefused] = useState<Exclude<AddResult, "added"> | null>(null);
  const [open, setOpen] = useState<number | null>(0);

  const sections = [
    { title: "Details", body: `${product.name} in ${product.fleece.toLowerCase()} fleece, with the embroidery running from shoulder to cuff on both sleeves. ${notes.fabric}` },
    { title: "Size and fit", body: notes.sizeGuide },
    { title: "Delivery and returns", body: notes.delivery },
  ];

  function onAdd() {
    if (!size) {
      setNeedSize(true);
      setAdded(false);
      setRefused(null);
      return;
    }
    const result = add(product.slug, size);
    setNeedSize(false);
    setAdded(result === "added");
    setRefused(result === "added" ? null : result);
  }

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <div className="flex flex-col gap-4">
        <span className="cap">Design {product.number} · {product.fleece} fleece</span>
        <h1 className="display text-[clamp(48px,5.4vw,80px)] leading-[0.96]">
          {product.nameLead} <em>{product.nameTail}</em>
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[22px]">{money(priceOf(product.slug))}</span>
          <span className="inline-flex items-center gap-2.5">
            <i className="inline-block h-3 w-3 rounded-full" style={{ background: product.dot }} />
            <span className="cap">{product.threads}</span>
          </span>
        </div>
      </div>

      <p className="copy">{product.description}</p>

      <fieldset className="m-0 flex flex-col gap-3.5 border-0 p-0">
        <div className="flex items-baseline justify-between">
          <legend className="cap float-left text-ink">Size</legend>
          <span className="cap">[SIZE GUIDE]</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === size}
              onClick={() => {
                setSize(s);
                setNeedSize(false);
              }}
              className={`min-h-[48px] min-w-[56px] cursor-pointer border px-3.5 font-sans text-[13px] tracking-[0.1em] transition-colors ${
                s === size ? "border-ink bg-ink text-bone" : "border-ink/30 bg-transparent text-ink hover:border-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <button type="button" className="btn-ink w-full" onClick={onAdd}>Add to cart</button>
        <div aria-live="polite" className="flex flex-col gap-2">
          {needSize && <span className="cap text-bronze">Choose a size first</span>}
          {refused === "full" && (
            <span className="cap text-bronze">
              Your cart is full · {MAX_CART_LINES} lines is the most one order can hold
            </span>
          )}
          {refused === "max" && (
            <span className="cap text-bronze">
              {MAX_LINE_QTY} is the most of one size in a single order
            </span>
          )}
          {added && (
            <span className="cap text-ink">
              Added · {count} in cart · <Link href="/cart" className="underline underline-offset-4">View cart</Link>
            </span>
          )}
        </div>
        <span className="cap">{notes.shipping} · {notes.returns}</span>
      </div>

      <div>
        {sections.map((s, i) => {
          const isOpen = open === i;
          return (
            <div key={s.title} className="border-t border-line">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full cursor-pointer items-center justify-between gap-6 border-0 bg-transparent py-5 text-left font-sans text-xs font-medium uppercase tracking-btn text-ink transition-colors hover:text-bronze"
              >
                <span>{s.title}</span>
                <span className="text-lg tracking-normal">{isOpen ? "–" : "+"}</span>
              </button>
              {isOpen && <p className="copy mb-[22px] text-[15px]">{s.body}</p>}
            </div>
          );
        })}
        <div className="border-t border-line" />
      </div>
    </div>
  );
}
