"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ApiError,
  ApiUnreachable,
  MAX_LINE_QTY,
  ORDER_LIMITS,
  apiBase,
  conflictLines,
  createOrder,
  fieldErrors,
} from "@/lib/api";
import type {
  CartConflict,
  CreateOrderRequest,
  Img,
  LineStatus,
  Minor,
  Order,
  ReconciledLine,
} from "@/lib/api-types";
import { useCart, type CartItem } from "@/lib/cart";
import { moneyMinor, notes, priceOf, shippingFlat } from "@/lib/config";
import { getProduct, isRenderable, products } from "@/lib/products";
import { useReconcile } from "@/lib/use-reconcile";
import OrderConfirmation from "./OrderConfirmation";
import Photo from "./Photo";

/** Shown where a figure is the server's to give and it has not given it yet. */
const PENDING = "Calculated at checkout";

/**
 * One cart row, from whichever source priced it.
 *
 * `POST /cart/reconcile` is the real source: it returns the name, image,
 * remaining sizes and money for every line in one call. The fixture fills in
 * for it while no API is configured, which is how this shop renders during
 * design work and in the tests.
 */
type Row = {
  slug: string;
  size: string;
  /** What the shopper asked for. */
  qty: number;
  name: string;
  image: Img | null;
  detail: string;
  /** Minor units, and it prices `buyableQty` rather than `qty`. */
  lineTotal: Minor;
  status: LineStatus;
  buyableQty: number;
  available: number | null;
  /** The sizes still made, for a sold-out line to offer instead. */
  sizes: string[];
  /** False once a design has stopped being sold: there is no page left to link to. */
  hasPage: boolean;
};

/** Where checkout has got to. */
type Checkout =
  | { kind: "editing" }
  | { kind: "sending" }
  /** Something in the form is wrong — ours to fix, or the API's 422. */
  | { kind: "invalid"; errors: Record<string, string[]> }
  /** A 409: nothing typed is wrong, the stock moved underneath us. */
  | { kind: "conflict"; lines: CartConflict["errors"] }
  | { kind: "failed"; message: string }
  | { kind: "placed"; order: Order; sent: CreateOrderRequest }
  /** No API configured: the demo checkout, which charges nothing and writes nothing. */
  | { kind: "demo" };

/** The form fields that map to a field of the order; anything else is a line error. */
const FORM_FIELDS = new Set([
  "email",
  "firstName",
  "lastName",
  "address1",
  "address2",
  "city",
  "postcode",
  "country",
  "phone",
  "customerNote",
]);

/** A readable name for a slug the shop can no longer tell us anything about. */
function nameFromSlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function fixtureRow(i: CartItem): Row {
  const p = getProduct(i.slug);
  return {
    slug: i.slug,
    size: i.size,
    qty: i.qty,
    name: p?.name ?? nameFromSlug(i.slug),
    image: p && isRenderable(p) ? p.hoodie : null,
    detail: p ? `${p.fleece} fleece · Size ${i.size}` : `Size ${i.size}`,
    // `prices` is in whole units and the API is in minor units. Every figure
    // below this line is minor, so the conversion happens here, once.
    lineTotal: Math.round(i.qty * priceOf(i.slug) * 100),
    status: "ok",
    buyableQty: i.qty,
    available: null,
    sizes: [],
    hasPage: !!p,
  };
}

function reconciledRow(l: ReconciledLine): Row {
  return {
    slug: l.slug,
    size: l.size,
    qty: l.qty,
    name: l.name ?? nameFromSlug(l.slug),
    image: l.image,
    detail: `Size ${l.size}`,
    lineTotal: l.lineTotal,
    status: l.status,
    buyableQty: l.buyableQty,
    available: l.available,
    sizes: l.sizes,
    hasPage: l.status !== "gone",
  };
}

function text(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

/**
 * Builds the request from the form.
 *
 * The cart sends what it displays — a slug and a size, never a variant id — so
 * a cart saved before a variant was rebuilt still checks out. No amounts are
 * sent either: the server prices the order.
 */
function buildOrder(
  form: FormData,
  items: CartItem[],
  discountCode: string | null,
): CreateOrderRequest {
  const address2 = text(form, "address2");
  const phone = text(form, "phone");
  const customerNote = text(form, "customerNote");

  return {
    items: items.map(({ slug, size, qty }) => ({ slug, size, qty })),
    email: text(form, "email").toLowerCase(),
    firstName: text(form, "firstName"),
    lastName: text(form, "lastName"),
    address1: text(form, "address1"),
    city: text(form, "city"),
    postcode: text(form, "postcode"),
    country: text(form, "country"),
    ...(address2 ? { address2 } : {}),
    ...(phone ? { phone } : {}),
    ...(customerNote ? { customerNote } : {}),
    ...(discountCode ? { discountCode } : {}),
  };
}

/**
 * Catches an empty or obviously wrong form before it costs a request: orders
 * are limited to five a minute, so a round trip to be told the email is blank
 * is one the shopper cannot spare.
 */
function validate(order: CreateOrderRequest): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {};
  const required: [string, string, string][] = [
    ["email", order.email, "Email"],
    ["firstName", order.firstName, "First name"],
    ["lastName", order.lastName, "Last name"],
    ["address1", order.address1, "Address"],
    ["city", order.city, "City"],
    ["postcode", order.postcode, "Postcode"],
    ["country", order.country, "Country"],
  ];

  for (const [name, value, label] of required) {
    if (!value) errors[name] = [`${label} is required.`];
  }
  // The server checks the domain really takes mail; this only catches a typo
  // early, so it stays deliberately loose.
  if (order.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(order.email)) {
    errors.email = ["That does not look like an email address."];
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

function describeFailure(error: unknown): string {
  if (error instanceof ApiUnreachable) {
    return "We could not reach the shop to place your order. Nothing was charged — please try again.";
  }
  if (error instanceof ApiError && error.status === 429) {
    return "That is a few too many attempts in a row. Please wait a minute and try again.";
  }
  return "Something went wrong placing your order. Nothing was charged — please try again.";
}

/** Cart lines, checkout form and order summary. */
export default function CartView() {
  const { items, ready, setQty, remove, clear } = useCart();
  const [checkout, setCheckout] = useState<Checkout>({ kind: "editing" });
  const reconcile = useReconcile(items);

  // The last good answer, which survives a refresh and a dropped connection so
  // that changing a quantity never blanks the cart.
  const live = reconcile.data;
  const totals = live?.totals ?? null;
  const rows: Row[] = live ? live.lines.map(reconciledRow) : items.map(fixtureRow);

  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = totals ? totals.subtotal : rows.reduce((n, r) => n + r.lineTotal, 0);
  const delivery = totals ? totals.shipping : rows.length ? Math.round(shippingFlat * 100) : 0;
  const pending = reconcile.kind === "loading";
  // The order endpoint would answer 409, so the button waits for the shopper.
  const blocked = !!live && !live.payable;
  const discountCode = live?.discount?.valid ? live.discount.code : null;

  const formErrors = checkout.kind === "invalid" ? checkout.errors : {};
  // A 422 keys by field path, and `items.0.size` matches no field on the form.
  const lineErrors = Object.entries(formErrors).filter(([key]) => !FORM_FIELDS.has(key));

  async function placeOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Read the form before anything awaits: `currentTarget` is gone by then.
    const request = buildOrder(new FormData(e.currentTarget), items, discountCode);

    // With no API configured this is the demo checkout: nothing is written.
    if (!apiBase()) {
      clear();
      setCheckout({ kind: "demo" });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const problems = validate(request);
    if (problems) {
      setCheckout({ kind: "invalid", errors: problems });
      return;
    }

    setCheckout({ kind: "sending" });
    try {
      const order = await createOrder(request);
      // Only now: the cart is the shopper's only copy until the order exists.
      clear();
      setCheckout({ kind: "placed", order, sent: request });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      const lines = conflictLines(error);
      if (lines) {
        setCheckout({ kind: "conflict", lines });
        return;
      }
      const fields = fieldErrors(error);
      if (fields) {
        setCheckout({ kind: "invalid", errors: fields });
        return;
      }
      setCheckout({ kind: "failed", message: describeFailure(error) });
    }
  }

  if (checkout.kind === "placed") {
    return <OrderConfirmation order={checkout.order} sent={checkout.sent} />;
  }

  if (checkout.kind === "demo") {
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

  if (items.length === 0) {
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

  const sending = checkout.kind === "sending";

  return (
    <div className="flex flex-wrap items-start gap-x-[72px] gap-y-14">
      <div className="flex min-w-0 flex-[1.5_1_460px] flex-col gap-14">
        <div aria-busy={pending || undefined}>
          <div className="border-t border-line pb-1 pt-5"><span className="cap text-ink">Items</span></div>

          {reconcile.kind === "error" && reconcile.message && (
            <p role="status" className="copy border-t border-line py-4 text-[13px] text-bronze">
              {reconcile.message} Stock and prices are confirmed when you place the order.
            </p>
          )}

          {rows.map((r) => (
            <div key={r.slug + r.size} className="flex flex-wrap items-center gap-x-6 gap-y-5 border-t border-line py-6">
              <div className="w-[112px] flex-none">
                {r.image ? (
                  r.hasPage ? (
                    <Link href={`/products/${r.slug}`} aria-label={r.name}>
                      <Photo src={r.image.src} alt="" ratio="4/5" sizes="112px" />
                    </Link>
                  ) : (
                    <Photo src={r.image.src} alt="" ratio="4/5" sizes="112px" />
                  )
                ) : (
                  // No photograph to show: a bordered space keeps the row's shape.
                  <div className="border border-line bg-paper" style={{ aspectRatio: "4/5" }} />
                )}
              </div>

              <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2">
                <span className="display text-[28px] leading-[1.05]">{r.name}</span>
                <span className="cap">{r.detail}</span>

                {r.status === "insufficient_stock" && (
                  <span className="cap flex flex-wrap items-center gap-2 text-bronze">
                    Only {r.available} left in this size
                    {r.buyableQty > 0 && (
                      <button
                        type="button"
                        className="tlink border-x-0 border-t-0 bg-transparent px-0 font-sans"
                        onClick={() => setQty(r.slug, r.size, r.buyableQty)}
                      >
                        Reduce to {r.buyableQty}
                      </button>
                    )}
                  </span>
                )}
                {r.status === "unavailable" && (
                  <span className="cap text-bronze">
                    This size has sold out
                    {r.sizes.length > 0 && ` · still made in ${r.sizes.join(", ")}`}
                  </span>
                )}
                {r.status === "gone" && (
                  <span className="cap text-bronze">This design is no longer sold</span>
                )}

                <button type="button" className="tlink self-start border-x-0 border-t-0 bg-transparent px-0 font-sans" onClick={() => remove(r.slug, r.size)}>Remove</button>
              </div>

              {r.status === "gone" ? (
                <span className="cap flex-none">Removed from the shop</span>
              ) : (
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="One fewer" className="h-10 w-10 cursor-pointer border border-ink/30 bg-transparent text-lg hover:border-ink disabled:cursor-default disabled:opacity-40" disabled={r.qty <= 1} onClick={() => setQty(r.slug, r.size, r.qty - 1)}>–</button>
                  <span className="min-w-6 text-center text-[15px]" aria-label="Quantity">{r.qty}</span>
                  <button type="button" aria-label="One more" className="h-10 w-10 cursor-pointer border border-ink/30 bg-transparent text-lg hover:border-ink disabled:cursor-default disabled:opacity-40" disabled={r.qty >= MAX_LINE_QTY} onClick={() => setQty(r.slug, r.size, r.qty + 1)}>+</button>
                </div>
              )}

              <span className="min-w-[72px] flex-none text-right text-[15px]">
                {r.lineTotal > 0 ? moneyMinor(r.lineTotal) : "—"}
              </span>
            </div>
          ))}
          <div className="border-t border-line" />
        </div>

        <form onSubmit={placeOrder} noValidate className="flex flex-col gap-14">
          <Step n="01" title="Contact">
            <Field label="Email" errors={formErrors.email}>
              <input className="field" name="email" type="email" required autoComplete="email" maxLength={ORDER_LIMITS.email} placeholder="you@example.com" />
            </Field>
            <Field label="Phone" errors={formErrors.phone}>
              <input className="field" name="phone" type="tel" autoComplete="tel" maxLength={ORDER_LIMITS.phone} />
            </Field>
            <p className="copy text-sm">A phone number is optional, and only used if there is a problem with your delivery.</p>
          </Step>

          <Step n="02" title="Delivery">
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
              <Field label="First name" errors={formErrors.firstName}>
                <input className="field" name="firstName" required autoComplete="given-name" maxLength={ORDER_LIMITS.firstName} />
              </Field>
              <Field label="Last name" errors={formErrors.lastName}>
                <input className="field" name="lastName" required autoComplete="family-name" maxLength={ORDER_LIMITS.lastName} />
              </Field>
            </div>
            <Field label="Address" errors={formErrors.address1}>
              <input className="field" name="address1" required autoComplete="address-line1" maxLength={ORDER_LIMITS.address1} />
            </Field>
            <Field label="Address line 2" errors={formErrors.address2}>
              <input className="field" name="address2" autoComplete="address-line2" maxLength={ORDER_LIMITS.address2} />
            </Field>
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr))]">
              <Field label="City" errors={formErrors.city}>
                <input className="field" name="city" required autoComplete="address-level2" maxLength={ORDER_LIMITS.city} />
              </Field>
              <Field label="Postcode" errors={formErrors.postcode}>
                <input className="field" name="postcode" required autoComplete="postal-code" maxLength={ORDER_LIMITS.postcode} />
              </Field>
              <Field label="Country" errors={formErrors.country}>
                <input className="field" name="country" required autoComplete="country-name" maxLength={ORDER_LIMITS.country} />
              </Field>
            </div>
            <Field label="Order notes" errors={formErrors.customerNote}>
              <textarea className="field min-h-[96px]" name="customerNote" rows={3} maxLength={ORDER_LIMITS.customerNote} />
            </Field>
            <p className="copy text-sm">{notes.deliveryMethods}</p>
          </Step>

          <Step n="03" title="Payment">
            <div className="border border-dashed border-ink/40 p-7">
              <p className="copy text-[15px]">Nothing is charged here. We email payment instructions with your order number, and make your hoodie once the payment lands.</p>
            </div>
          </Step>

          <div className="flex flex-col gap-3">
            {checkout.kind === "conflict" && (
              <div role="alert" className="flex flex-col gap-2 border border-bronze/50 p-5">
                <span className="cap text-bronze">Your order was not placed</span>
                <p className="copy text-[13px]">
                  These lines sold out while you were checking out. Nothing was charged and your
                  cart is untouched — adjust them and try again.
                </p>
                <ul className="flex flex-col gap-1">
                  {checkout.lines.map((l) => (
                    <li key={l.slug + l.size} className="cap text-bronze">
                      {rows.find((r) => r.slug === l.slug)?.name ?? nameFromSlug(l.slug)}, size{" "}
                      {l.size} —{" "}
                      {l.reason === "insufficient_stock"
                        ? `only ${l.available} left`
                        : "no longer available"}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lineErrors.length > 0 && (
              <div role="alert" className="flex flex-col gap-1 border border-bronze/50 p-5">
                <span className="cap text-bronze">Some lines cannot be ordered</span>
                {lineErrors.map(([key, messages]) => (
                  <span key={key} className="cap text-bronze">{messages.join(" ")}</span>
                ))}
              </div>
            )}

            {checkout.kind === "failed" && (
              <p role="alert" className="copy text-[13px] text-bronze">{checkout.message}</p>
            )}

            {blocked && (
              <p role="status" className="copy text-[13px] text-bronze">
                Adjust the lines marked above before placing the order.
              </p>
            )}

            <button
              type="submit"
              className="btn-ink w-full max-w-[420px] disabled:cursor-default disabled:opacity-50"
              disabled={pending || blocked || sending}
              aria-busy={sending || undefined}
            >
              {sending ? "Placing your order…" : "Place order"}
            </button>
          </div>
        </form>
      </div>

      <aside className="flex min-w-0 max-w-[440px] flex-[1_1_320px] flex-col gap-5 border border-line bg-paper p-8 md:sticky md:top-6">
        <span className="cap text-ink">Summary</span>
        <Row label={`${count} ${count === 1 ? "item" : "items"}`} value={moneyMinor(subtotal)} />
        {totals !== null && totals.discount > 0 && (
          <Row
            label={discountCode ? `Discount · ${discountCode}` : "Discount"}
            value={`−${moneyMinor(totals.discount)}`}
          />
        )}
        <Row label="Delivery" value={delivery ? moneyMinor(delivery) : "Free"} />
        {/*
          Tax and the total are the server's to state. The API applies
          `taxRateBp` and treats its own answer as authoritative, so until a
          reconcile has come back these say so rather than showing a figure the
          final charge would then disagree with.
        */}
        <Row label="Tax" value={totals ? moneyMinor(totals.tax) : PENDING} />
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-5">
          <span className="display text-[28px]">Total</span>
          <span className="text-lg">{totals ? moneyMinor(totals.total) : PENDING}</span>
        </div>
        <p className="copy text-[13px] leading-[1.6]">
          {totals
            ? "Stock and prices were checked just now, and confirmed again when you place the order. "
            : "Delivery and tax are confirmed when you place the order. "}
          {notes.returns}
        </p>
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

/**
 * The message sits outside the `<label>` on purpose: inside, it would become
 * part of the field's accessible name.
 */
function Field({
  label,
  errors,
  children,
}: {
  label: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-2">
        <span className="cap">{label}</span>
        {children}
      </label>
      {errors?.map((message) => (
        <span key={message} className="cap text-bronze">{message}</span>
      ))}
    </div>
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
