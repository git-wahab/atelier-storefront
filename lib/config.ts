/**
 * Store settings. Edit these before launch.
 *
 * Prices are SAMPLE values so the cart can show totals.
 * Replace them with your real prices, or load them from your store backend.
 * Text in [BRACKETS] anywhere in the project is placeholder copy.
 */
export const brandName = "TIG Atelier";
export const currency = "$";

export const prices: Record<string, number> = {
  "whispering-crane-bird": 120,
  "midnight-bloom": 120,
};

/** Flat delivery charge. Set to 0 for free delivery. */
export const shippingFlat = 0;

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

export function priceOf(slug: string): number {
  // Guard with typeof, not `?? 0`: a plain object literal also answers for
  // inherited keys ("constructor", "toString"), which would hand money() a
  // function and throw on .toFixed.
  const price = prices[slug];
  return typeof price === "number" ? price : 0;
}
