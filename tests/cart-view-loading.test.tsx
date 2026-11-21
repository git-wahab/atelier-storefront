import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The pre-hydration branch only shows while `ready` is false, which the real
// provider leaves almost immediately — so the hook is stubbed here instead.
vi.mock("@/lib/cart", () => ({
  useCart: () => ({
    items: [],
    ready: false,
    count: 0,
    add: vi.fn(),
    setQty: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  }),
}));

const { default: CartView } = await import("@/components/CartView");

describe("before the saved cart has been read", () => {
  it("shows a busy placeholder instead of an empty cart", () => {
    const { container } = render(<CartView />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByText("Your cart is empty.")).not.toBeInTheDocument();
  });

  it("shows no checkout form yet", () => {
    render(<CartView />);
    expect(screen.queryByRole("button", { name: "Place order" })).not.toBeInTheDocument();
  });
});
