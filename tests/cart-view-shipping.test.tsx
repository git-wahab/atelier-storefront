import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Delivery is free in the shipped config, so the charged branch never runs in
// the other suites. This pins the behaviour for whoever sets a real rate.
vi.mock("@/lib/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/config")>()),
  shippingFlat: 7.5,
}));

const { default: CartView } = await import("@/components/CartView");
const { CartProvider } = await import("@/lib/cart");
const { money, priceOf } = await import("@/lib/config");
const { products } = await import("@/lib/products");

const crane = products[0];

function setup(qty = 2) {
  window.localStorage.setItem(
    "luxCart",
    JSON.stringify([{ slug: crane.slug, size: "M", qty }]),
  );
  render(
    <CartProvider>
      <CartView />
    </CartProvider>,
  );
  const summary = within(screen.getByText("Summary").parentElement!);
  return (label: string) =>
    summary.getByText(label, { selector: "span" }).parentElement!.lastElementChild!.textContent;
}

beforeEach(() => window.localStorage.clear());

describe("with a flat delivery charge configured", () => {
  it("shows the charge instead of Free", () => {
    const value = setup();
    expect(value("Delivery")).toBe(money(7.5));
  });

  it("adds the charge to the total once, not per item", () => {
    const value = setup(2);
    const subtotal = 2 * priceOf(crane.slug);
    expect(value("2 items")).toBe(money(subtotal));
    expect(value("Total")).toBe(money(subtotal + 7.5));
  });
});
