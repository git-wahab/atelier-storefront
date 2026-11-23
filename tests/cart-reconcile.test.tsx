import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The cart's prices and stock come from `POST /cart/reconcile`. The client is
// mocked and `apiBase` forced, so these tests exercise the live path that the
// rest of the suite, with no API configured, never reaches.
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiBase: () => "https://admin.example.test/api/v1",
    reconcileCart: vi.fn(),
  };
});

import CartView from "@/components/CartView";
import { reconcileCart } from "@/lib/api";
import type { CartReconcile } from "@/lib/api-types";
import { CartProvider, type CartItem } from "@/lib/cart";
import { moneyMinor, notes } from "@/lib/config";

const CART: CartItem[] = [
  { slug: "whispering-crane-bird", size: "M", qty: 1 },
  { slug: "midnight-bloom", size: "S", qty: 5 },
  { slug: "whispering-crane-bird", size: "XL", qty: 1 },
  { slug: "autumn-fern", size: "L", qty: 2 },
];

/** The documented example response, line for line. */
const RECONCILE: CartReconcile = {
  lines: [
    {
      slug: "whispering-crane-bird",
      size: "M",
      qty: 1,
      buyableQty: 1,
      status: "ok",
      available: null,
      name: "Whispering Crane Bird",
      image: {
        src: "https://admin.example.test/storage/products/crane-hoodie.jpg",
        alt: "Whispering Crane Bird hoodie",
        width: 843,
        height: 1264,
      },
      sizes: ["XS", "S", "M", "L"],
      unitPrice: 12000,
      lineTotal: 12000,
    },
    {
      slug: "midnight-bloom",
      size: "S",
      qty: 5,
      buyableQty: 2,
      status: "insufficient_stock",
      available: 2,
      name: "Midnight Bloom",
      image: {
        src: "https://admin.example.test/storage/products/bloom-hoodie.jpg",
        alt: "Midnight Bloom hoodie",
        width: 912,
        height: 1172,
      },
      sizes: ["XS", "S", "M", "L", "XL"],
      unitPrice: 12000,
      // Two in stock, so the line prices two even though five were asked for.
      lineTotal: 24000,
    },
    {
      slug: "whispering-crane-bird",
      size: "XL",
      qty: 1,
      buyableQty: 0,
      status: "unavailable",
      available: null,
      name: "Whispering Crane Bird",
      image: {
        src: "https://admin.example.test/storage/products/crane-hoodie.jpg",
        alt: "Whispering Crane Bird hoodie",
        width: 843,
        height: 1264,
      },
      sizes: ["XS", "S", "M", "L"],
      unitPrice: null,
      lineTotal: 0,
    },
    {
      slug: "autumn-fern",
      size: "L",
      qty: 2,
      buyableQty: 0,
      status: "gone",
      available: null,
      name: null,
      image: null,
      sizes: [],
      unitPrice: null,
      lineTotal: 0,
    },
  ],
  payable: false,
  discount: {
    valid: true,
    code: "WELCOME10",
    type: "percent",
    discount: 3600,
    message: "10% off applied",
  },
  totals: {
    subtotal: 36000,
    discount: 3600,
    shipping: 500,
    tax: 2754,
    total: 35654,
    currency: "USD",
  },
};

/** The same cart with everything in stock, for the paying case. */
const PAYABLE: CartReconcile = {
  lines: [RECONCILE.lines[0]],
  payable: true,
  discount: null,
  totals: {
    subtotal: 12000,
    discount: 0,
    shipping: 500,
    tax: 1020,
    total: 13520,
    currency: "USD",
  },
};

function savedCart(): CartItem[] {
  return JSON.parse(window.localStorage.getItem("luxCart") ?? "[]");
}

async function setup(data: CartReconcile = RECONCILE, items: CartItem[] = CART) {
  window.localStorage.setItem("luxCart", JSON.stringify(items));
  vi.mocked(reconcileCart).mockResolvedValue(data);
  const user = userEvent.setup();
  const view = render(
    <CartProvider>
      <CartView />
    </CartProvider>,
  );
  // The totals only appear once the call has come back.
  await waitFor(() =>
    expect(screen.getByText(moneyMinor(data.totals.total))).toBeInTheDocument(),
  );
  const summary = () => within(screen.getByText("Summary").parentElement!);
  const summaryValue = (label: string) =>
    summary().getByText(label, { selector: "span" }).parentElement!.lastElementChild!.textContent;
  const orderButton = () => screen.getByRole("button", { name: "Place order" });
  return { user, summary, summaryValue, orderButton, ...view };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("scrollTo", vi.fn());
});

describe("reconciling the cart", () => {
  it("sends the saved lines to the API", async () => {
    await setup();
    expect(reconcileCart).toHaveBeenCalledWith(CART, expect.anything());
  });

  it("names each line from the server, not from the local fixture", async () => {
    await setup();
    expect(screen.getAllByText("Whispering Crane Bird")).toHaveLength(2);
    expect(screen.getByText("Midnight Bloom")).toBeInTheDocument();
  });

  it("names a line whose product has gone from its slug, so it can still be removed", async () => {
    await setup();
    expect(screen.getByText("Autumn Fern")).toBeInTheDocument();
    expect(screen.getByText("This design is no longer sold")).toBeInTheDocument();
  });

  it("shows a row for every line, including the ones that cannot be bought", async () => {
    await setup();
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(4);
  });
});

describe("line money", () => {
  it("prices a line from the server's lineTotal", async () => {
    await setup();
    expect(screen.getByText(moneyMinor(12000))).toBeInTheDocument();
  });

  it("uses the buyable quantity, not the requested one", async () => {
    await setup();
    // Five asked for, two in stock: the line totals two, not five.
    expect(screen.getByText(moneyMinor(24000))).toBeInTheDocument();
    expect(screen.queryByText(moneyMinor(60000))).not.toBeInTheDocument();
  });

  it("shows a dash rather than nothing where no money is owed", async () => {
    await setup();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});

describe("line stock warnings", () => {
  it("says how many are left when a line is short", async () => {
    await setup();
    expect(screen.getByText(/Only 2 left in this size/)).toBeInTheDocument();
  });

  it("offers to reduce the line to what can be shipped", async () => {
    const { user } = await setup();
    await user.click(screen.getByRole("button", { name: "Reduce to 2" }));
    expect(savedCart()).toContainEqual({ slug: "midnight-bloom", size: "S", qty: 2 });
  });

  it("says a size has sold out, and which sizes are still made", async () => {
    await setup();
    expect(screen.getByText(/This size has sold out/)).toBeInTheDocument();
    expect(screen.getByText(/still made in XS, S, M, L/)).toBeInTheDocument();
  });

  it("drops the quantity controls on a line that is no longer sold", async () => {
    await setup();
    // Three of the four lines still have a pair; the `gone` line has none.
    expect(screen.getAllByLabelText("Quantity")).toHaveLength(3);
    expect(screen.getByText("Removed from the shop")).toBeInTheDocument();
  });
});

describe("summary from the server", () => {
  it("shows the server's subtotal", async () => {
    const { summaryValue } = await setup();
    expect(summaryValue("9 items")).toBe(moneyMinor(36000));
  });

  it("shows the discount, named by its code", async () => {
    const { summaryValue } = await setup();
    expect(summaryValue("Discount · WELCOME10")).toBe(`−${moneyMinor(3600)}`);
  });

  it("shows the delivery charge the server set, not the local one", async () => {
    const { summaryValue } = await setup();
    expect(summaryValue("Delivery")).toBe(moneyMinor(500));
  });

  it("shows real tax instead of a promise to work it out later", async () => {
    const { summaryValue } = await setup();
    expect(summaryValue("Tax")).toBe(moneyMinor(2754));
  });

  it("shows the server's total", async () => {
    const { summaryValue } = await setup();
    expect(summaryValue("Total")).toBe(moneyMinor(35654));
  });

  it("stops saying the figures are calculated at checkout", async () => {
    await setup();
    expect(screen.queryByText("Calculated at checkout")).not.toBeInTheDocument();
  });

  it("hides the discount row when no code applies", async () => {
    const { summary } = await setup(PAYABLE, [CART[0]]);
    expect(summary().queryByText(/Discount/)).not.toBeInTheDocument();
  });

  it("keeps the returns note", async () => {
    const { summary } = await setup();
    expect(
      summary().getByText(new RegExp(notes.returns.replace(/[[\]]/g, "\\$&"))),
    ).toBeInTheDocument();
  });
});

describe("gating the order", () => {
  it("will not take an order the API says is not payable", async () => {
    const { orderButton } = await setup();
    expect(orderButton()).toBeDisabled();
  });

  it("says what has to change first", async () => {
    await setup();
    expect(
      screen.getByText("Adjust the lines marked above before placing the order."),
    ).toBeInTheDocument();
  });

  it("takes the order once every line can be bought", async () => {
    const { orderButton } = await setup(PAYABLE, [CART[0]]);
    expect(orderButton()).toBeEnabled();
    expect(
      screen.queryByText("Adjust the lines marked above before placing the order."),
    ).not.toBeInTheDocument();
  });
});

describe("when the call fails", () => {
  it("says so and falls back to the local prices", async () => {
    window.localStorage.setItem("luxCart", JSON.stringify([CART[0]]));
    vi.mocked(reconcileCart).mockRejectedValue(new Error("offline"));
    render(
      <CartProvider>
        <CartView />
      </CartProvider>,
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        /could not reach the shop|went wrong/i,
      ),
    );
    // The row is still there, priced from the fixture, and the total waits.
    expect(screen.getByText("Whispering Crane Bird")).toBeInTheDocument();
    expect(screen.getAllByText("Calculated at checkout").length).toBeGreaterThan(0);
  });

  it("still lets the order through, since the order endpoint checks again", async () => {
    window.localStorage.setItem("luxCart", JSON.stringify([CART[0]]));
    vi.mocked(reconcileCart).mockRejectedValue(new Error("offline"));
    render(
      <CartProvider>
        <CartView />
      </CartProvider>,
    );
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Place order" })).toBeEnabled();
  });
});
