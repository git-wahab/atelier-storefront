import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CartView from "@/components/CartView";
import { CartProvider, type CartItem } from "@/lib/cart";
import { MAX_LINE_QTY } from "@/lib/api";
import { money, notes, priceOf, shippingFlat } from "@/lib/config";
import { products } from "@/lib/products";

const [crane, bloom] = products;

function seed(items: CartItem[]) {
  window.localStorage.setItem("luxCart", JSON.stringify(items));
}

function setup(items: CartItem[] = []) {
  seed(items);
  const user = userEvent.setup();
  const view = render(
    <CartProvider>
      <CartView />
    </CartProvider>,
  );
  const summary = () => within(screen.getByText("Summary").parentElement!);
  // Both the Row and the Total block render <span>label</span><span>value</span>,
  // so read the value from its own row. With free delivery the subtotal and the
  // total are the same string, and a document-wide query cannot tell them apart.
  const summaryValue = (label: string) =>
    summary().getByText(label, { selector: "span" }).parentElement!.lastElementChild!.textContent;
  const lineRow = (index = 0) =>
    within(screen.getAllByLabelText("Quantity")[index].closest("div.flex-wrap") as HTMLElement);
  return { user, summary, summaryValue, lineRow, ...view };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("scrollTo", vi.fn());
});

describe("empty cart", () => {
  it("says the cart is empty", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Your cart is empty." })).toBeInTheDocument();
  });

  it("offers a link to each design", () => {
    setup();
    for (const p of products) {
      expect(screen.getByRole("link", { name: p.name })).toHaveAttribute(
        "href",
        `/products/${p.slug}`,
      );
    }
  });

  it("shows no checkout form", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Place order" })).not.toBeInTheDocument();
  });

  // A saved line whose product has gone used to be dropped from the view while
  // staying in storage, so the shopper saw an empty cart that the header still
  // counted and nothing could clear it. The row is shown instead, named from
  // its slug and removable; against the API the same line comes back as `gone`.
  it("still shows a saved line whose product no longer exists", () => {
    setup([{ slug: "deleted-product", size: "M", qty: 2 }]);
    expect(screen.queryByRole("heading", { name: "Your cart is empty." })).not.toBeInTheDocument();
    expect(screen.getByText("Deleted Product")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("empties once that line is removed", async () => {
    const { user } = setup([{ slug: "deleted-product", size: "M", qty: 2 }]);
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("heading", { name: "Your cart is empty." })).toBeInTheDocument();
  });
});

describe("cart lines", () => {
  it("shows the product name, fleece and size", () => {
    setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    expect(screen.getByText(crane.name)).toBeInTheDocument();
    expect(screen.getByText(`${crane.fleece} fleece · Size M`)).toBeInTheDocument();
  });

  it("links the line back to the product page", () => {
    setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    expect(screen.getByRole("link", { name: crane.name })).toHaveAttribute(
      "href",
      `/products/${crane.slug}`,
    );
  });

  it("shows the quantity and the line total", () => {
    const { lineRow } = setup([{ slug: crane.slug, size: "M", qty: 3 }]);
    expect(screen.getByLabelText("Quantity")).toHaveTextContent("3");
    expect(lineRow().getByText(money(3 * priceOf(crane.slug)))).toBeInTheDocument();
  });

  it("renders one line per slug and size pair", () => {
    setup([
      { slug: crane.slug, size: "M", qty: 1 },
      { slug: crane.slug, size: "L", qty: 1 },
      { slug: bloom.slug, size: "S", qty: 1 },
    ]);
    expect(screen.getAllByLabelText("Quantity")).toHaveLength(3);
  });

  it("keeps the decorative line thumbnail out of the accessibility tree", () => {
    const { container } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    const thumb = container.querySelector('a[aria-label="' + crane.name + '"] img');
    expect(thumb).toHaveAttribute("alt", "");
  });
});

describe("changing quantities", () => {
  it("increments with One more", async () => {
    const { user } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    await user.click(screen.getByLabelText("One more"));
    expect(screen.getByLabelText("Quantity")).toHaveTextContent("2");
  });

  it("decrements with One fewer", async () => {
    const { user } = setup([{ slug: crane.slug, size: "M", qty: 3 }]);
    await user.click(screen.getByLabelText("One fewer"));
    expect(screen.getByLabelText("Quantity")).toHaveTextContent("2");
  });

  it("will not go below one", async () => {
    const { user } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    await user.click(screen.getByLabelText("One fewer"));
    expect(screen.getByLabelText("Quantity")).toHaveTextContent("1");
  });

  // The API takes a quantity of 1-10 per line, so the controls stop there
  // rather than letting the shopper build a cart that checkout would reject.
  it("will not go above the most one order can carry", () => {
    setup([{ slug: crane.slug, size: "M", qty: MAX_LINE_QTY }]);
    expect(screen.getByLabelText("One more")).toBeDisabled();
    expect(screen.getByLabelText("One fewer")).toBeEnabled();
  });

  it("stops the shopper reaching zero from the other end", () => {
    setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    expect(screen.getByLabelText("One fewer")).toBeDisabled();
    expect(screen.getByLabelText("One more")).toBeEnabled();
  });

  it("recalculates the line total", async () => {
    const { user } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    await user.click(screen.getByLabelText("One more"));
    expect(screen.getAllByText(money(2 * priceOf(crane.slug))).length).toBeGreaterThan(0);
  });

  it("only changes the line whose control was used", async () => {
    const { user } = setup([
      { slug: crane.slug, size: "M", qty: 1 },
      { slug: crane.slug, size: "L", qty: 1 },
    ]);
    await user.click(screen.getAllByLabelText("One more")[0]);
    const quantities = screen.getAllByLabelText("Quantity").map((n) => n.textContent);
    expect(quantities).toEqual(["2", "1"]);
  });
});

describe("removing lines", () => {
  it("removes the line", async () => {
    const { user } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("heading", { name: "Your cart is empty." })).toBeInTheDocument();
  });

  it("removes only the chosen line", async () => {
    const { user } = setup([
      { slug: crane.slug, size: "M", qty: 1 },
      { slug: bloom.slug, size: "S", qty: 1 },
    ]);
    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(screen.queryByText(crane.name)).not.toBeInTheDocument();
    expect(screen.getByText(bloom.name)).toBeInTheDocument();
  });
});

describe("summary", () => {
  it("counts a single item in the singular", () => {
    const { summary } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    expect(summary().getByText("1 item")).toBeInTheDocument();
  });

  it("counts several items in the plural", () => {
    const { summary } = setup([{ slug: crane.slug, size: "M", qty: 2 }]);
    expect(summary().getByText("2 items")).toBeInTheDocument();
  });

  it("sums quantities across lines", () => {
    const { summary } = setup([
      { slug: crane.slug, size: "M", qty: 2 },
      { slug: bloom.slug, size: "S", qty: 3 },
    ]);
    expect(summary().getByText("5 items")).toBeInTheDocument();
  });

  it("adds the subtotal from every line", () => {
    const { summaryValue } = setup([
      { slug: crane.slug, size: "M", qty: 2 },
      { slug: bloom.slug, size: "S", qty: 1 },
    ]);
    const expected = 2 * priceOf(crane.slug) + priceOf(bloom.slug);
    expect(summaryValue("3 items")).toBe(money(expected));
  });

  it("shows free delivery while the flat rate is zero", () => {
    const { summary } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    expect(summary().getByText(shippingFlat ? money(shippingFlat) : "Free")).toBeInTheDocument();
  });

  // The API is the only authority on what the customer is charged: it applies
  // `taxRateBp` and returns the priced order. A figure worked out here would be
  // about 8.5% short of the real one, so the cart names neither tax nor total.
  it("leaves tax to the order response rather than estimating it", () => {
    const { summaryValue } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    expect(summaryValue("Tax")).toBe("Calculated at checkout");
  });

  it("leaves the total to the order response too, since tax is part of it", () => {
    const { summaryValue } = setup([{ slug: crane.slug, size: "M", qty: 2 }]);
    expect(summaryValue("Total")).toBe("Calculated at checkout");
  });

  it("says where delivery and tax are confirmed, so the gap is explained", () => {
    const { summary } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    expect(
      summary().getByText(/Delivery and tax are confirmed when you place the order/),
    ).toBeInTheDocument();
  });

  it("shows delivery as its own row rather than folding it into the subtotal", () => {
    const { summaryValue } = setup([{ slug: crane.slug, size: "M", qty: 2 }]);
    expect(summaryValue("Delivery")).toBe(shippingFlat ? money(shippingFlat) : "Free");
    expect(summaryValue("2 items")).toBe(money(2 * priceOf(crane.slug)));
  });

  it("repeats the returns note", () => {
    const { summary } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    expect(summary().getByText(new RegExp(notes.returns.replace(/[[\]]/g, "\\$&")))).toBeInTheDocument();
  });
});

describe("checkout form", () => {
  it("asks for contact and delivery details", () => {
    setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    for (const label of [
      "Email",
      "First name",
      "Last name",
      "Address",
      "City",
      "Postcode",
      "Country",
    ]) {
      expect(screen.getByLabelText(label), label).toBeRequired();
    }
  });

  it("offers autofill hints on every delivery field", () => {
    setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    const expected: Record<string, string> = {
      Email: "email",
      "First name": "given-name",
      "Last name": "family-name",
      // Two address lines now, so the pair is address-line1/2 rather than the
      // single `street-address` a one-line field would use.
      Address: "address-line1",
      "Address line 2": "address-line2",
      City: "address-level2",
      Postcode: "postal-code",
      Country: "country-name",
    };
    for (const [label, value] of Object.entries(expected)) {
      expect(screen.getByLabelText(label), label).toHaveAttribute("autocomplete", value);
    }
  });

  it("numbers the three checkout steps", () => {
    setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    for (const [n, title] of [
      ["01", "Contact"],
      ["02", "Delivery"],
      ["03", "Payment"],
    ]) {
      expect(screen.getByText(n)).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  // There is no online payment in this API by design: an order is created
  // `awaiting_payment` and its `paymentInstructions` say how to pay. A "connect
  // your provider here" placeholder would describe a checkout that is not the
  // one being built.
  it("says plainly that nothing is charged at this step", () => {
    setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    expect(screen.getByText(/Nothing is charged here/)).toBeInTheDocument();
    expect(screen.getByText(/payment instructions with your order number/)).toBeInTheDocument();
  });

  it("offers the optional fields the API accepts", () => {
    setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    for (const label of ["Phone", "Address line 2", "Order notes"]) {
      expect(screen.getByLabelText(label), label).not.toBeRequired();
    }
  });

  it("shows the delivery methods note", () => {
    setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    expect(screen.getByText(notes.deliveryMethods)).toBeInTheDocument();
  });
});

describe("placing the order", () => {
  async function placeOrder(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("First name"), "Ada");
    await user.type(screen.getByLabelText("Last name"), "Lovelace");
    await user.type(screen.getByLabelText("Address"), "1 Analytical Way");
    await user.type(screen.getByLabelText("City"), "London");
    await user.type(screen.getByLabelText("Postcode"), "W1 1AA");
    await user.type(screen.getByLabelText("Country"), "UK");
    await user.click(screen.getByRole("button", { name: "Place order" }));
  }

  it("confirms the order", async () => {
    const { user } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    await placeOrder(user);
    expect(screen.getByText("Order received")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Thank you." })).toBeInTheDocument();
  });

  it("says plainly that nothing was charged", async () => {
    const { user } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    await placeOrder(user);
    expect(screen.getByText(/nothing was charged/)).toBeInTheDocument();
  });

  it("empties the saved cart", async () => {
    const { user } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    await placeOrder(user);
    expect(JSON.parse(window.localStorage.getItem("luxCart")!)).toEqual([]);
  });

  it("scrolls back to the top", async () => {
    const { user } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    await placeOrder(user);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("offers a way back to the collection", async () => {
    const { user } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    await placeOrder(user);
    expect(screen.getByRole("link", { name: "Keep browsing" })).toHaveAttribute(
      "href",
      "/#collection",
    );
  });

  it("shows the confirmation rather than the empty-cart message", async () => {
    const { user } = setup([{ slug: crane.slug, size: "M", qty: 1 }]);
    await placeOrder(user);
    expect(screen.queryByRole("heading", { name: "Your cart is empty." })).not.toBeInTheDocument();
  });
});
