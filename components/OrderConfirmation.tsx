import Link from "next/link";
import type { CreateOrderRequest, Order, OrderStatus } from "@/lib/api-types";
import { moneyMinor } from "@/lib/config";

const STATUS: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  shipped: "Shipped",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/**
 * The thank-you page for a placed order.
 *
 * Every figure here is read from the order, never recomputed: the order keeps
 * what it was sold for, so changing the tax rate tomorrow cannot rewrite what
 * somebody paid. The delivery address is the exception — the response carries
 * no address at all, so it comes from the request that was sent.
 */
export default function OrderConfirmation({
  order,
  sent,
}: {
  order: Order;
  sent: CreateOrderRequest;
}) {
  // A code can be valid in the cart and unredeemable seconds later at
  // checkout. The order is placed at full price rather than failing, which the
  // customer has to be told plainly instead of left to compare totals.
  const discountLapsed = !!sent.discountCode && !order.discountApplied;

  return (
    <div className="flex flex-col gap-12 border-t border-line pt-12">
      <div className="flex max-w-[640px] flex-col gap-5">
        <span className="cap">Order received</span>
        <h2 className="h-side">Thank you.</h2>
        <p className="copy">
          We have emailed a confirmation to {order.email}. Keep your order number: it is how
          you refer to this order, and how we match your payment to it.
        </p>

        <dl className="flex flex-wrap gap-x-12 gap-y-4 border-y border-line py-6">
          <div className="flex flex-col gap-1">
            <dt className="cap">Order number</dt>
            <dd className="display text-[32px] leading-none">{order.orderNumber}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="cap">Status</dt>
            <dd className="text-[15px]">{STATUS[order.status]}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="cap">Placed</dt>
            <dd className="text-[15px]">{order.createdAt}</dd>
          </div>
        </dl>
      </div>

      {/*
        There is no online payment yet, so this is the only thing telling the
        customer how to pay. A thank-you page without it reads as a broken
        checkout.
      */}
      <section className="flex max-w-[640px] flex-col gap-4 border border-ink/40 p-7">
        <h3 className="cap text-ink">How to pay</h3>
        <p className="copy text-[15px]">{order.paymentInstructions}</p>
      </section>

      {discountLapsed && (
        <p role="status" className="copy max-w-[640px] text-[15px] text-bronze">
          The code {sent.discountCode} could not be redeemed by the time your order was
          placed, so it was placed at full price. Nothing else about it has changed.
        </p>
      )}

      <div className="flex flex-wrap items-start gap-x-[72px] gap-y-12">
        <section className="flex min-w-0 flex-[1.5_1_420px] flex-col gap-5">
          <h3 className="cap text-ink">What you ordered</h3>
          {order.items.map((item) => (
            <div
              key={item.slug + item.size}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-line pt-4"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="display text-[22px] leading-tight">{item.name}</span>
                <span className="cap">
                  Size {item.size} · {item.qty} × {moneyMinor(item.unitPrice)}
                </span>
              </div>
              <span className="text-[15px]">{moneyMinor(item.lineTotal)}</span>
            </div>
          ))}
        </section>

        <aside className="flex min-w-0 max-w-[400px] flex-[1_1_300px] flex-col gap-5 border border-line bg-paper p-8">
          <span className="cap text-ink">Total paid</span>
          <Line label="Subtotal" value={moneyMinor(order.subtotal)} />
          {order.discount > 0 && (
            <Line
              label={order.discountCode ? `Discount · ${order.discountCode}` : "Discount"}
              value={`−${moneyMinor(order.discount)}`}
            />
          )}
          <Line label="Delivery" value={order.shipping ? moneyMinor(order.shipping) : "Free"} />
          <Line label="Tax" value={moneyMinor(order.tax)} />
          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-5">
            <span className="display text-[28px]">Total</span>
            <span className="text-lg">{moneyMinor(order.total)}</span>
          </div>
        </aside>
      </div>

      <section className="flex max-w-[640px] flex-col gap-3">
        <h3 className="cap text-ink">Delivering to</h3>
        <address className="copy not-italic text-[15px] leading-[1.7]">
          {[
            `${sent.firstName} ${sent.lastName}`,
            sent.address1,
            sent.address2,
            sent.city,
            sent.postcode,
            sent.country,
          ]
            .filter(Boolean)
            .map((part) => (
              <span key={part} className="block">
                {part}
              </span>
            ))}
        </address>
        {sent.customerNote && <p className="copy text-[13px]">Note: {sent.customerNote}</p>}
      </section>

      <div>
        <Link className="btn-ink" href="/#collection">
          Keep browsing
        </Link>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-[15px]">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
