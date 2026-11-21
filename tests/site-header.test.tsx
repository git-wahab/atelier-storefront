import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import SiteHeader from "@/components/SiteHeader";
import { CartProvider, type CartItem } from "@/lib/cart";
import { notes } from "@/lib/config";

function setup(items: CartItem[] = []) {
  window.localStorage.setItem("luxCart", JSON.stringify(items));
  return render(
    <CartProvider>
      <SiteHeader />
    </CartProvider>,
  );
}

beforeEach(() => window.localStorage.clear());

describe("announcement bar", () => {
  it("repeats the shipping note", () => {
    setup();
    expect(screen.getByText(new RegExp(notes.shipping.replace(/[[\]]/g, "\\$&")))).toBeInTheDocument();
  });
});

describe("navigation", () => {
  it("links to the main sections", () => {
    setup();
    const expected: Record<string, string> = {
      Collection: "/#collection",
      Artwork: "/#artwork",
      Craft: "/#craft",
      Help: "/help",
    };
    for (const [name, href] of Object.entries(expected)) {
      expect(screen.getByRole("link", { name }), name).toHaveAttribute("href", href);
    }
  });

  it("labels the primary navigation landmark", () => {
    setup();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });

  it("links the logo home with an accessible name", () => {
    setup();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  });

  it("renders inside a banner landmark", () => {
    setup();
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });
});

describe("cart link", () => {
  it("shows an empty cart as zero", () => {
    setup();
    const link = screen.getByRole("link", { name: "Cart, 0 items" });
    expect(link).toHaveAttribute("href", "/cart");
    expect(link).toHaveTextContent("Cart (0)");
  });

  it("shows the saved quantity once the cart has been read", () => {
    setup([{ slug: "whispering-crane-bird", size: "M", qty: 2 }]);
    expect(screen.getByRole("link", { name: "Cart, 2 items" })).toHaveTextContent("Cart (2)");
  });

  it("sums quantities across lines", () => {
    setup([
      { slug: "whispering-crane-bird", size: "M", qty: 2 },
      { slug: "midnight-bloom", size: "S", qty: 3 },
    ]);
    expect(screen.getByRole("link", { name: "Cart, 5 items" })).toHaveTextContent("Cart (5)");
  });

  it("counts a corrupt saved cart as empty", () => {
    window.localStorage.setItem("luxCart", "{broken");
    render(
      <CartProvider>
        <SiteHeader />
      </CartProvider>,
    );
    expect(screen.getByRole("link", { name: "Cart, 0 items" })).toHaveTextContent("Cart (0)");
  });
});
