import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiBase: () => "https://admin.example.test/api/v1",
    reconcileCart: vi.fn(),
    createOrder: vi.fn(),
  };
});

import CartView from "@/components/CartView";
import { ApiError, ApiUnreachable, createOrder, reconcileCart } from "@/lib/api";
import type { CartReconcile, CreateOrderRequest, Order } from "@/lib/api-types";
import { CartProvider, type CartItem } from "@/lib/cart";
import { moneyMinor } from "@/lib/config";

const CART: CartItem[] = [{ slug: "whispering-crane-bird", size: "M", qty: 2 }];

function reconciled(discountCode: string | null = null): CartReconcile {
  return {
    lines: [
      {
        slug: "whispering-crane-bird",
        size: "M",
        qty: 2,
        buyableQty: 2,
        status: "ok",
        available: null,
        name: "Whispering Crane Bird",
        image: null,
        sizes: ["S", "M", "L"],
        unitPrice: 12000,
        lineTotal: 24000,
      },
    ],
    payable: true,
    discount: discountCode
      ? {
          valid: true,
          code: discountCode,
          type: "percent",
          discount: 2400,
          message: "10% off applied",
        }
      : null,
    totals: {
      subtotal: 24000,
      discount: discountCode ? 2400 : 0,
      shipping: 500,
      tax: discountCode ? 1836 : 2040,
      total: discountCode ? 23936 : 26540,
      currency: "USD",
    },
  };
}

const ORDER: Order = {
  orderNumber: "AT-62AFSB",
  status: "awaiting_payment",
  email: "ada@example.com",
  subtotal: 24000,
  discount: 0,
  shipping: 500,
  tax: 2040,
  total: 26540,
  currency: "USD",
  discountApplied: false,
  discountCode: null,
  items: [
    {
      slug: "whispering-crane-bird",
      name: "Whispering Crane Bird",
      size: "M",
      qty: 2,
      unitPrice: 12000,
      lineTotal: 24000,
    },
  ],
  paymentInstructions:
    "Transfer the total to Atelier, sort code 00-00-00, using your order number as the reference.",
  shippedAt: null,
  trackingCarrier: null,
  trackingNumber: null,
  createdAt: "2026-11-23T15:21:02Z",
};

const DETAILS: Record<string, string> = {
  Email: "Ada@Example.com",
  "First name": "Ada",
  "Last name": "Lovelace",
  Address: "1 Analytical Way",
  City: "London",
  Postcode: "W1 1AA",
  Country: "United Kingdom",
};

function savedCart(): CartItem[] {
  return JSON.parse(window.localStorage.getItem("luxCart") ?? "[]");
}

/** The request the component sent. */
function sentOrder(): CreateOrderRequest {
  return vi.mocked(createOrder).mock.calls[0][0];
}

async function setup(cart: CartItem[] = CART, data: CartReconcile = reconciled()) {
  window.localStorage.setItem("luxCart", JSON.stringify(cart));
  vi.mocked(reconcileCart).mockResolvedValue(data);
  const user = userEvent.setup();
  render(
    <CartProvider>
      <CartView />
    </CartProvider>,
  );
  await waitFor(() =>
    expect(screen.getByText(moneyMinor(data.totals.total))).toBeInTheDocument(),
  );

  async function fill(fields: Record<string, string> = DETAILS) {
    for (const [label, value] of Object.entries(fields)) {
      await user.type(screen.getByLabelText(label), value);
    }
  }
  const place = () => user.click(screen.getByRole("button", { name: /Place order/ }));
  return { user, fill, place };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("scrollTo", vi.fn());
  vi.mocked(createOrder).mockResolvedValue(ORDER);
});

describe("what gets sent", () => {
  it("sends the cart as slugs and sizes, with no amounts of its own", async () => {
    const { fill, place } = await setup();
    await fill();
    await place();
    await waitFor(() => expect(createOrder).toHaveBeenCalled());
    expect(sentOrder().items).toEqual([
      { slug: "whispering-crane-bird", size: "M", qty: 2 },
    ]);
  });

  it("sends the typed details, with the email lower-cased", async () => {
    const { fill, place } = await setup();
    await fill();
    await place();
    await waitFor(() => expect(createOrder).toHaveBeenCalled());
    expect(sentOrder()).toMatchObject({
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      address1: "1 Analytical Way",
      city: "London",
      postcode: "W1 1AA",
      country: "United Kingdom",
    });
  });

  it("leaves the optional fields out rather than sending empty strings", async () => {
    const { fill, place } = await setup();
    await fill();
    await place();
    await waitFor(() => expect(createOrder).toHaveBeenCalled());
    const sent = sentOrder();
    expect(sent).not.toHaveProperty("address2");
    expect(sent).not.toHaveProperty("phone");
    expect(sent).not.toHaveProperty("customerNote");
  });

  it("sends the optional fields when they are filled in", async () => {
    const { fill, place } = await setup();
    await fill({
      ...DETAILS,
      "Address line 2": "Flat 3",
      Phone: "+44 7700 900123",
      "Order notes": "Leave with a neighbour.",
    });
    await place();
    await waitFor(() => expect(createOrder).toHaveBeenCalled());
    expect(sentOrder()).toMatchObject({
      address2: "Flat 3",
      phone: "+44 7700 900123",
      customerNote: "Leave with a neighbour.",
    });
  });

  it("carries the discount code the cart had applied", async () => {
    const { fill, place } = await setup(CART, reconciled("WELCOME10"));
    await fill();
    await place();
    await waitFor(() => expect(createOrder).toHaveBeenCalled());
    expect(sentOrder().discountCode).toBe("WELCOME10");
  });
});

describe("the form's own checks", () => {
  it("does not spend a request on an empty form", async () => {
    const { place } = await setup();
    await place();
    expect(createOrder).not.toHaveBeenCalled();
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Postcode is required.")).toBeInTheDocument();
  });

  it("catches an email that cannot be one", async () => {
    const { fill, place } = await setup();
    await fill({ ...DETAILS, Email: "ada@example" });
    await place();
    expect(createOrder).not.toHaveBeenCalled();
    expect(screen.getByText("That does not look like an email address.")).toBeInTheDocument();
  });

  it("limits each field to the length the API accepts", async () => {
    await setup();
    expect(screen.getByLabelText("Email")).toHaveAttribute("maxlength", "190");
    expect(screen.getByLabelText("Postcode")).toHaveAttribute("maxlength", "32");
    expect(screen.getByLabelText("Order notes")).toHaveAttribute("maxlength", "1000");
  });

  it("keeps the cart when the form is refused", async () => {
    const { place } = await setup();
    await place();
    expect(savedCart()).toEqual(CART);
  });
});

describe("a placed order", () => {
  async function place() {
    const view = await setup();
    await view.fill();
    await view.place();
    await waitFor(() => expect(screen.getByText("Order received")).toBeInTheDocument());
    return view;
  }

  it("shows the order number, which is the payment reference", async () => {
    await place();
    expect(screen.getByText("AT-62AFSB")).toBeInTheDocument();
  });

  it("says the order is awaiting payment", async () => {
    await place();
    expect(screen.getByText("Awaiting payment")).toBeInTheDocument();
  });

  it("says how to pay, since nothing was charged online", async () => {
    await place();
    expect(screen.getByText(ORDER.paymentInstructions)).toBeInTheDocument();
    expect(screen.getByText("How to pay")).toBeInTheDocument();
  });

  it("names the address it is being delivered to, which the response does not carry", async () => {
    await place();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("1 Analytical Way")).toBeInTheDocument();
    expect(screen.getByText("W1 1AA")).toBeInTheDocument();
  });

  it("confirms where the email went", async () => {
    await place();
    expect(screen.getByText(/ada@example\.com/)).toBeInTheDocument();
  });

  it("renders the order's own figures", async () => {
    await place();
    const total = screen.getByText("Total").parentElement!;
    expect(within(total).getByText(moneyMinor(26540))).toBeInTheDocument();
    expect(screen.getByText(moneyMinor(2040))).toBeInTheDocument();
  });

  it("lists what was ordered, from the snapshot the order keeps", async () => {
    await place();
    expect(screen.getByText("Whispering Crane Bird")).toBeInTheDocument();
    expect(screen.getByText(`Size M · 2 × ${moneyMinor(12000)}`)).toBeInTheDocument();
  });

  it("empties the cart, but only once the order exists", async () => {
    await place();
    expect(savedCart()).toEqual([]);
  });

  it("scrolls back to the top", async () => {
    await place();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("offers a way back to the collection", async () => {
    await place();
    expect(screen.getByRole("link", { name: "Keep browsing" })).toHaveAttribute(
      "href",
      "/#collection",
    );
  });

  it("shows the confirmation rather than the empty-cart message", async () => {
    await place();
    expect(screen.queryByRole("heading", { name: "Your cart is empty." })).not.toBeInTheDocument();
  });
});

describe("a discount that lapsed between cart and checkout", () => {
  it("says the order went through at full price", async () => {
    const { fill, place } = await setup(CART, reconciled("WELCOME10"));
    await fill();
    await place();
    await waitFor(() => expect(screen.getByText("Order received")).toBeInTheDocument());
    // The code was sent, `discountApplied` came back false: the order stands.
    expect(screen.getByRole("status")).toHaveTextContent(/WELCOME10 could not be redeemed/);
    expect(screen.getByRole("status")).toHaveTextContent(/placed at full price/);
  });

  it("stays quiet when no code was sent at all", async () => {
    const { fill, place } = await setup();
    await fill();
    await place();
    await waitFor(() => expect(screen.getByText("Order received")).toBeInTheDocument());
    expect(screen.queryByText(/could not be redeemed/)).not.toBeInTheDocument();
  });
});

describe("when a line sold out during checkout", () => {
  const conflict = new ApiError(409, "conflict", {
    message: "Some items are no longer available",
    errors: [
      { slug: "whispering-crane-bird", size: "M", reason: "insufficient_stock", available: 1 },
    ],
  });

  async function attempt() {
    const view = await setup();
    vi.mocked(createOrder).mockRejectedValue(conflict);
    await view.fill();
    await view.place();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    return view;
  }

  it("names the line and how many are left", async () => {
    await attempt();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Whispering Crane Bird, size M — only 1 left/,
    );
  });

  it("says nothing was charged and the cart is untouched", async () => {
    await attempt();
    expect(screen.getByRole("alert")).toHaveTextContent(/Nothing was charged/);
    expect(savedCart()).toEqual(CART);
  });

  it("does not show a confirmation", async () => {
    await attempt();
    expect(screen.queryByText("Order received")).not.toBeInTheDocument();
  });

  it("reads a line that was withdrawn rather than sold down", async () => {
    const view = await setup();
    vi.mocked(createOrder).mockRejectedValue(
      new ApiError(409, "conflict", {
        message: "gone",
        errors: [{ slug: "whispering-crane-bird", size: "M", reason: "unavailable" }],
      }),
    );
    await view.fill();
    await view.place();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(/no longer available/);
  });
});

describe("when the API refuses the request", () => {
  it("shows the server's own field messages", async () => {
    const view = await setup();
    vi.mocked(createOrder).mockRejectedValue(
      new ApiError(422, "unprocessable", {
        message: "The email field must be a valid email address.",
        errors: { email: ["That domain does not accept mail."] },
      }),
    );
    await view.fill();
    await view.place();
    await waitFor(() =>
      expect(screen.getByText("That domain does not accept mail.")).toBeInTheDocument(),
    );
    expect(savedCart()).toEqual(CART);
  });

  it("surfaces an error about a line, which belongs to no form field", async () => {
    const view = await setup();
    vi.mocked(createOrder).mockRejectedValue(
      new ApiError(422, "unprocessable", {
        message: "nope",
        errors: { "items.0.size": ["That size is not available for this design."] },
      }),
    );
    await view.fill();
    await view.place();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(
      /That size is not available for this design/,
    );
  });
});

describe("when the order cannot be sent", () => {
  it("says the shop could not be reached and keeps the cart", async () => {
    const view = await setup();
    vi.mocked(createOrder).mockRejectedValue(new ApiUnreachable("offline"));
    await view.fill();
    await view.place();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(/could not reach the shop/);
    expect(screen.getByRole("alert")).toHaveTextContent(/Nothing was charged/);
    expect(savedCart()).toEqual(CART);
  });

  it("asks the shopper to wait when they have tried too often", async () => {
    const view = await setup();
    vi.mocked(createOrder).mockRejectedValue(new ApiError(429, "too many", null));
    await view.fill();
    await view.place();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(/wait a minute/);
  });

  it("lets the shopper try again", async () => {
    const view = await setup();
    vi.mocked(createOrder).mockRejectedValue(new ApiUnreachable("offline"));
    await view.fill();
    await view.place();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    vi.mocked(createOrder).mockResolvedValue(ORDER);
    await view.place();
    await waitFor(() => expect(screen.getByText("Order received")).toBeInTheDocument());
  });
});

describe("while the order is in flight", () => {
  it("will not send it twice", async () => {
    const view = await setup();
    let release: (order: Order) => void = () => {};
    vi.mocked(createOrder).mockReturnValue(
      new Promise<Order>((resolve) => {
        release = resolve;
      }),
    );
    await view.fill();
    await view.place();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Placing your order/ })).toBeDisabled(),
    );
    expect(createOrder).toHaveBeenCalledTimes(1);

    release(ORDER);
    await waitFor(() => expect(screen.getByText("Order received")).toBeInTheDocument());
  });
});
