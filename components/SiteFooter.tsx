import Link from "next/link";
import { brandName, contact } from "@/lib/config";
import { products } from "@/lib/products";
import LogoMark from "./LogoMark";

export default function SiteFooter() {
  return (
    <footer className="dark-band bg-ink text-bone">
      <div className="gut flex flex-wrap justify-between gap-x-16 gap-y-12 pb-10 pt-16">
        <div className="flex max-w-[300px] flex-[1_1_220px] flex-col gap-[18px]">
          <LogoMark tone="dark" />
          <p className="m-0 text-sm leading-[1.7] text-dark-dim">
            Embroidered hoodies where the design is the point.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-[72px] gap-y-10">
          <div className="flex flex-col gap-3.5">
            <span className="cap text-dark-dim">Shop</span>
            {products.map((p) => (
              <Link key={p.slug} className="flink" href={`/products/${p.slug}`}>{p.name}</Link>
            ))}
          </div>
          <div className="flex flex-col gap-3.5">
            <span className="cap text-dark-dim">Help</span>
            <Link className="flink" href="/help">FAQ</Link>
            <Link className="flink" href="/help#contact">Contact</Link>
            <span className="text-sm text-dark-soft">{contact.email}</span>
          </div>
          <div className="flex flex-col gap-3.5">
            <span className="cap text-dark-dim">Follow</span>
            <span className="text-sm text-dark-soft">{contact.instagram}</span>
            <span className="text-sm text-dark-soft">{contact.otherSocial}</span>
          </div>
        </div>
      </div>
      <div className="gut flex flex-wrap justify-between gap-3 border-t border-bone/15 pb-8 pt-6 text-xs text-dark-dim">
        <span>© {new Date().getFullYear()} {brandName}. All rights reserved.</span>
        <span>[PRIVACY] · [TERMS]</span>
      </div>
    </footer>
  );
}
