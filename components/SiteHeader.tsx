"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { notes } from "@/lib/config";
import LogoMark from "./LogoMark";

export default function SiteHeader() {
  const { count, ready } = useCart();
  return (
    <>
      <div className="bg-ink px-5 py-[11px] text-center text-[11px] font-medium uppercase tracking-cap text-bone">
        Embroidery on both sleeves · Two designs · {notes.shipping}
      </div>
      <header className="gut flex items-center justify-between gap-5 border-b border-line py-[22px]">
        <nav aria-label="Main" className="hidden flex-1 items-center gap-8 md:flex">
          <Link className="nav" href="/#collection">Collection</Link>
          <Link className="nav" href="/#artwork">Artwork</Link>
          <Link className="nav" href="/#craft">Craft</Link>
        </nav>
        <Link href="/" aria-label="Home" className="flex-none no-underline">
          <LogoMark />
        </Link>
        <div className="flex flex-1 items-center justify-end gap-7">
          <Link className="nav hidden md:inline" href="/help">Help</Link>
          <Link className="btn-out min-h-[44px] px-[22px]" href="/cart" aria-label={`Cart, ${count} items`}>
            Cart ({ready ? count : 0})
          </Link>
        </div>
      </header>
    </>
  );
}
