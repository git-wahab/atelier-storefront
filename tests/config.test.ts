import { describe, expect, it } from "vitest";
import {
  brandName,
  contact,
  currency,
  money,
  moneyMinor,
  notes,
  priceOf,
  prices,
  shippingFlat,
  sizes,
} from "@/lib/config";
import { products } from "@/lib/products";

describe("money", () => {
  it("prefixes the configured currency symbol", () => {
    expect(money(120)).toBe("$120.00");
    expect(money(120).startsWith(currency)).toBe(true);
  });

  it("always shows exactly two decimal places", () => {
    expect(money(0)).toBe("$0.00");
    expect(money(5)).toBe("$5.00");
    expect(money(5.5)).toBe("$5.50");
    expect(money(5.55)).toBe("$5.55");
  });

  it("rounds to the nearest cent", () => {
    expect(money(120.456)).toBe("$120.46");
    expect(money(120.454)).toBe("$120.45");
  });

  it("formats zero and negative amounts (refunds, discounts)", () => {
    expect(money(0)).toBe("$0.00");
    expect(money(-5)).toBe("$-5.00");
  });

  // Documents real toFixed behaviour rather than wishing it away: these are
  // binary-float artefacts, so a "correct" half-up expectation would fail.
  it("inherits toFixed float rounding on exact-half cents", () => {
    expect(money(1.005)).toBe("$1.00");
    expect(money(2.675)).toBe("$2.67");
    expect(money(0.005)).toBe("$0.01");
  });

  it("falls back to exponential notation at 1e21, where toFixed gives up", () => {
    expect(money(1e21)).toBe("$1e+21");
  });

  it("produces NaN text rather than throwing on a bad amount", () => {
    expect(money(Number.NaN)).toBe("$NaN");
  });
});

describe("priceOf", () => {
  it("returns the configured price for a known slug", () => {
    expect(priceOf("whispering-crane-bird")).toBe(120);
    expect(priceOf("midnight-bloom")).toBe(120);
  });

  it("returns 0 for an unknown slug instead of undefined", () => {
    expect(priceOf("no-such-product")).toBe(0);
  });

  it("returns 0 for an empty slug", () => {
    expect(priceOf("")).toBe(0);
  });

  it("does not resolve inherited Object properties as prices", () => {
    expect(priceOf("constructor")).toBe(0);
    expect(priceOf("toString")).toBe(0);
    expect(priceOf("__proto__")).toBe(0);
  });

  it("never returns a non-number, so money() is always safe", () => {
    for (const slug of ["whispering-crane-bird", "nope", ""]) {
      expect(typeof priceOf(slug)).toBe("number");
      expect(Number.isNaN(priceOf(slug))).toBe(false);
    }
  });
});

describe("price table", () => {
  it("has an entry for every product in the catalogue", () => {
    for (const product of products) {
      expect(prices).toHaveProperty(product.slug);
      expect(priceOf(product.slug)).toBeGreaterThan(0);
    }
  });

  it("has no stale entries for products that no longer exist", () => {
    const slugs = products.map((p) => p.slug);
    for (const slug of Object.keys(prices)) {
      expect(slugs).toContain(slug);
    }
  });
});

describe("store settings", () => {
  it("exposes a single-character currency symbol", () => {
    expect(currency).toBe("$");
  });

  it("offers the five sizes the size picker renders, in ascending order", () => {
    expect(sizes).toEqual(["XS", "S", "M", "L", "XL"]);
  });

  it("has no duplicate sizes, so React keys stay unique", () => {
    expect(new Set(sizes).size).toBe(sizes.length);
  });

  it("treats shipping as a usable number", () => {
    expect(typeof shippingFlat).toBe("number");
    expect(shippingFlat).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(shippingFlat)).toBe(true);
  });

  it("exposes a brand name for the header and footer", () => {
    expect(brandName.trim().length).toBeGreaterThan(0);
  });

  it("defines every note the product and help pages read", () => {
    for (const key of [
      "shipping",
      "returns",
      "fabric",
      "fit",
      "care",
      "sizeGuide",
      "delivery",
      "deliveryMethods",
    ] as const) {
      expect(notes[key].trim().length).toBeGreaterThan(0);
    }
  });

  it("defines every contact field the footer and help page read", () => {
    for (const key of ["email", "instagram", "otherSocial", "hours", "responseTime"] as const) {
      expect(contact[key].trim().length).toBeGreaterThan(0);
    }
  });
});

// The API deals only in integer minor units, the local `prices` map in whole
// ones. Two formatters keep the boundary visible; one would silently render a
// minor-unit figure a hundred times too large.
describe("moneyMinor", () => {
  it("formats minor units as the shop's currency", () => {
    expect(moneyMinor(12000)).toBe(money(120));
  });

  it("keeps the fractional part", () => {
    expect(moneyMinor(35654)).toBe(money(356.54));
    expect(moneyMinor(500)).toBe(money(5));
  });

  it("formats zero rather than an empty string", () => {
    expect(moneyMinor(0)).toBe(money(0));
  });

  it("formats a single minor unit", () => {
    expect(moneyMinor(1)).toBe(money(0.01));
  });

  it("agrees with money for every whole-unit price in the shop", () => {
    for (const slug of Object.keys(prices)) {
      expect(moneyMinor(Math.round(priceOf(slug) * 100)), slug).toBe(money(priceOf(slug)));
    }
  });
});
