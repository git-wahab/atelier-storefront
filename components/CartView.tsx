"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { money, notes, priceOf, shippingFlat } from "@/lib/config";
import { getProduct, products } from "@/lib/products";
import Photo from "./Photo";

/**
 * Cart lines, checkout form and order summary.
 * TODO before launch: replace `placeOrder` with your checkout provider
 * (Stripe Checkout, Shopify, and so on). No payment is taken here.
 */
export default function CartView() {
  const { items, ready, setQty, remove, clear } = useCart();
  const [done, setDone] = useState(false);

  const lines = items
    .map((i) => ({ ...i, product: getProduct(i.slug) }))
    .filter((l): l is typeof l & { product: NonNullable<typeof l.product> } => !!l.product);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((n, l) => n + l.qty * priceOf(l.slug), 0);
  const total = subtotal + (lines.length ? shippingFlat : 0);

  function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    clear();
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done) {
    return (
      <div className="flex max-w-[560px] flex-col gap-5 border-t border-line pt-12">
        <span className="cap">Order received</span>
        <h2 className="h-side">Thank you.</h2>
        <p className="copy">This is a demo checkout, so nothing was charged. In the live shop a confirmation would go to your email. [ORDER CONFIRMATION COPY]</p>
        <div><Link className="btn-ink" href="/#collection">Keep browsing</Link></div>
      </div>
    );
  }

  if (!ready) return <div className="min-h-[200px] border-t border-line" aria-busy="true" />;

  if (lines.length === 0) {
    return (
      <div className="flex max-w-[560px] flex-col gap-5 border-t border-line pt-12">
        <h2 className="display text-[clamp(34px,3.6vw,52px)] leading-[1.05]">Your cart is empty.</h2>
        <p className="copy">Choose a design and a size, and it will appear here.</p>
        <div className="flex flex-wrap gap-3.5">
          {products.map((p, i) => (
            <Link key={p.slug} className={i === 0 ? "btn-ink" : "btn-out"} href={`/products/${p.slug}`}>{p.name}</Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-x-[72px] gap-y-14">
      <div className="flex min-w-0 flex-[1.5_1_460px] flex-col gap-14">
        <div>
          <div className="border-t border-line pb-1 pt-5"><span className="cap text-ink">Items</span></div>
          {lines.map((l) => (
            <div key={l.slug + l.size} className="flex flex-wrap items-center gap-x-6 gap-y-5 border-t border-line py-6">
              <Link href={`/products/${l.slug}`} className="w-[112px] flex-none" aria-label={l.product.name}>
                <Photo src={l.product.hoodie.src} alt="" ratio="4/5" sizes="112px" />
              </Link>
              <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2">
                <span className="display text-[28px] leading-[1.05]">{l.product.name}</span>
                <span className="cap">{l.product.fleece} fleece · Size {l.size}</span>
                <button type="button" className="tlink self-start border-x-0 border-t-0 bg-transparent px-0 font-sans" onClick={() => remove(l.slug, l.size)}>Remove</button>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" aria-label="One fewer" className="h-10 w-10 cursor-pointer border border-ink/30 bg-transparent text-lg hover:border-ink" onClick={() => setQty(l.slug, l.size, l.qty - 1)}>–</button>
                <span className="min-w-6 text-center text-[15px]" aria-label="Quantity">{l.qty}</span>
                <button type="button" aria-label="One more" className="h-10 w-10 cursor-pointer border border-ink/30 bg-transparent text-lg hover:border-ink" onClick={() => setQty(l.slug, l.size, l.qty + 1)}>+</button>
              </div>
              <span className="min-w-[72px] flex-none text-right text-[15px]">{money(l.qty * priceOf(l.slug))}</span>
            </div>
          ))}
          <div className="border-t border-line" />
        </div>

        <form onSubmit={placeOrder} className="flex flex-col gap-14">
          <Step n="01" title="Contact">
            <Field label="Email"><input className="field" type="email" required autoComplete="email" placeholder="you@example.com" /></Field>
          </Step>
          <Step n="02" title="Delivery">
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
              <Field label="First name"><input className="field" required autoComplete="given-name" /></Field>
              <Field label="Last name"><input className="field" required autoComplete="family-name" /></Field>
            </div>
            <Field label="Address"><input className="field" required autoComplete="street-address" /></Field>
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr))]">
              <Field label="City"><input className="field" required autoComplete="address-level2" /></Field>
              <Field label="Postcode"><input className="field" required autoComplete="postal-code" /></Field>
              <Field label="Country"><input className="field" required autoComplete="country-name" /></Field>
            </div>
            <p className="copy text-sm">{notes.deliveryMethods}</p>
          </Step>
          <Step n="03" title="Payment">
            <div className="border border-dashed border-ink/40 p-7">
              <p className="copy text-[15px]">[PAYMENT PROVIDER FIELDS]. Connect Stripe or your shop platform here. No card details are collected in this demo.</p>
            </div>
          </Step>
          <div><button type="submit" className="btn-ink w-full max-w-[420px]">Place order</button></div>
        </form>
      </div>

      <aside className="flex min-w-0 max-w-[440px] flex-[1_1_320px] flex-col gap-5 border border-line bg-paper p-8 md:sticky md:top-6">
        <span className="cap text-ink">Summary</span>
        <Row label={`${count} ${count === 1 ? "item" : "items"}`} value={money(subtotal)} />
        <Row label="Delivery" value={shippingFlat ? money(shippingFlat) : "Free"} />
        <Row label="Tax" value="[TAX]" />
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-5">
          <span className="display text-[28px]">Total</span>
          <span className="text-lg">{money(total)}</span>
        </div>
        <p className="copy text-[13px] leading-[1.6]">Prices are sample values set in lib/config.ts. {notes.returns}</p>
      </aside>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline gap-4">
        <span className="cap text-bronze">{n}</span>
        <h2 className="display text-[clamp(30px,3vw,42px)] leading-none">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="cap">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-[15px]">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
