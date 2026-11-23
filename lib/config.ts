/**
 * Store settings. Edit these before launch.
 *
 * Prices are SAMPLE values so the cart can show totals.
 * Replace them with your real prices, or load them from your store backend.
 * Text in [BRACKETS] anywhere in the project is placeholder copy.
 */
export const brandName = "[Brand name]";
export const currency = "$";

export const prices: Record<string, number> = {
  "whispering-crane-bird": 120,
  "midnight-bloom": 120,
};

/** Flat delivery charge. Set to 0 for free delivery. */
export const shippingFlat = 0;

/**
 * Tax rate in basis points: 850 is 8.5%, matching the API's `taxRateBp`.
 *
 * The API computes tax on the DISCOUNTED subtotal and does not tax delivery:
 *
 *     taxable = subtotal - discount
 *     tax     = round(taxable * taxRateBp / 10000)
 *     total   = taxable + tax + shipping
 *
 * The storefront must not charge from this figure. `POST /orders` returns the
 * authoritative amounts and the order keeps them forever, so changing the rate
 * tomorrow cannot rewrite what somebody already paid. This constant exists for
 * copy and for tests, not for arithmetic the customer is billed on.
 */
export const taxRateBp = 850;

export const sizes = ["XS", "S", "M", "L", "XL"];

export const notes = {
  shipping: "[SHIPPING NOTE]",
  returns: "[RETURNS NOTE]",
  fabric: "[FABRIC DETAILS]",
  fit: "[FIT NOTES]",
  care: "[CARE INSTRUCTIONS]",
  sizeGuide: "[SIZE GUIDE AND FIT NOTES]",
  delivery: "[DELIVERY TIMES AND RETURNS POLICY]",
  deliveryMethods: "[DELIVERY METHODS AND TIMES]",
};

export const contact = {
  email: "[EMAIL ADDRESS]",
  instagram: "[INSTAGRAM HANDLE]",
  otherSocial: "[OTHER SOCIAL]",
  hours: "[SUPPORT HOURS]",
  responseTime: "[RESPONSE TIME]",
};

export function money(amount: number): string {
  return currency + amount.toFixed(2);
}

/**
 * Formats the integer minor units the API deals in: 12000 becomes "$120.00".
 *
 * Every figure that comes back from the API goes through this one, and the
 * whole-unit `prices` map above goes through `money`. Keeping the two apart is
 * what stops a minor-unit figure rendering a hundred times too large.
 */
export function moneyMinor(minor: number): string {
  return money(minor / 100);
}

export function priceOf(slug: string): number {
  // Guard with typeof, not `?? 0`: a plain object literal also answers for
  // inherited keys ("constructor", "toString"), which would hand money() a
  // function and throw on .toFixed.
  const price = prices[slug];
  return typeof price === "number" ? price : 0;
}
