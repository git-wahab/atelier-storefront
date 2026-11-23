import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  ApiUnreachable,
  apiBase,
  conflictLines,
  createOrder,
  fieldErrors,
  reconcileCart,
} from "@/lib/api";
import type {
  CartLine,
  CartReconcile,
  CreateOrderRequest,
  Order,
} from "@/lib/api-types";

const BASE = "https://admin.example.test/api/v1";
const items: CartLine[] = [{ slug: "whispering-crane-bird", size: "M", qty: 1 }];

const body: CartReconcile = {
  lines: [],
  payable: true,
  discount: null,
  totals: { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0, currency: "USD" },
};

/** Enough of a Response for the client: it reads `ok`, `status` and `json()`. */
function answer(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

// Typed parameters, so the recorded calls can be read back as a tuple.
function mockFetch(payload: unknown, status = 200) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
    answer(payload, status),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

type FetchMock = ReturnType<typeof mockFetch>;

/** The body of the one call that was made. */
function sentBody(fetchMock: FetchMock): unknown {
  return JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", BASE);
});

describe("apiBase", () => {
  it("returns null when no API is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(apiBase()).toBeNull();
  });

  it("strips trailing slashes, so paths do not double up", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", `${BASE}///`);
    expect(apiBase()).toBe(BASE);
  });

  it("ignores surrounding whitespace", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", `  ${BASE}  `);
    expect(apiBase()).toBe(BASE);
  });
});

describe("reconcileCart", () => {
  it("posts the cart to /cart/reconcile", async () => {
    const fetchMock = mockFetch({ data: body });
    await reconcileCart(items);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/cart/reconcile`);
    const init = fetchMock.mock.calls[0][1];
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("sends the lines exactly as the cart holds them", async () => {
    const fetchMock = mockFetch({ data: body });
    await reconcileCart(items);
    expect(sentBody(fetchMock)).toEqual({ items });
  });

  it("omits discountCode when there is none, rather than sending null", async () => {
    const fetchMock = mockFetch({ data: body });
    await reconcileCart(items);
    expect(sentBody(fetchMock)).not.toHaveProperty("discountCode");
  });

  it("sends a discount code when one is given", async () => {
    const fetchMock = mockFetch({ data: body });
    await reconcileCart(items, { discountCode: "WELCOME10" });
    expect(sentBody(fetchMock)).toEqual({ items, discountCode: "WELCOME10" });
  });

  it("unwraps the data envelope", async () => {
    mockFetch({ data: body });
    await expect(reconcileCart(items)).resolves.toEqual(body);
  });

  it("refuses an empty cart instead of a guaranteed 422", async () => {
    const fetchMock = mockFetch({ data: body });
    await expect(reconcileCart([])).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not call out at all when no API is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const fetchMock = mockFetch({ data: body });
    await expect(reconcileCart(items)).rejects.toBeInstanceOf(ApiUnreachable);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the status and the body of a rejection, so the caller can read the fields", async () => {
    const payload = { message: "The cart is invalid.", errors: { "items.0.qty": ["Too many."] } };
    mockFetch(payload, 422);
    await expect(reconcileCart(items)).rejects.toMatchObject({
      status: 422,
      body: payload,
    });
  });

  it("treats a dead network as unreachable rather than a failed call", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(reconcileCart(items)).rejects.toBeInstanceOf(ApiUnreachable);
  });

  it("lets an abort through, so the caller can tell it from a failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new DOMException("The user aborted a request.", "AbortError");
    }));
    await expect(reconcileCart(items)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects a payload shaped unlike the contract, instead of passing it to a component", async () => {
    mockFetch({ data: { payable: true } });
    await expect(reconcileCart(items)).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects a response with no envelope at all", async () => {
    mockFetch(null);
    await expect(reconcileCart(items)).rejects.toBeInstanceOf(ApiError);
  });
});

const request: CreateOrderRequest = {
  items,
  email: "rowan.vale@example.com",
  firstName: "Rowan",
  lastName: "Vale",
  address1: "14 Mercer Street",
  city: "Leeds",
  postcode: "LS1 6DQ",
  country: "United Kingdom",
};

/** The documented 201 body. */
const order: Order = {
  orderNumber: "AT-62AFSB",
  status: "awaiting_payment",
  email: "rowan.vale@example.com",
  subtotal: 24000,
  discount: 2400,
  shipping: 500,
  tax: 1836,
  total: 23936,
  currency: "USD",
  discountApplied: true,
  discountCode: "WELCOME10",
  items: [
    {
      slug: "whispering-crane-bird",
      name: "Whispering Crane Bird",
      size: "M",
      qty: 1,
      unitPrice: 12000,
      lineTotal: 12000,
    },
  ],
  paymentInstructions: "Transfer the total using your order number as the reference.",
  shippedAt: null,
  trackingCarrier: null,
  trackingNumber: null,
  createdAt: "2026-11-23T15:21:02Z",
};

describe("createOrder", () => {
  it("posts the order to /orders", async () => {
    const fetchMock = mockFetch({ data: order }, 201);
    await createOrder(request);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/orders`);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
  });

  it("sends the request as given, with no amounts of its own", async () => {
    const fetchMock = mockFetch({ data: order }, 201);
    await createOrder(request);
    const sent = sentBody(fetchMock) as Record<string, unknown>;
    expect(sent).toEqual(request);
    for (const amount of ["subtotal", "tax", "total", "shipping", "discount"]) {
      expect(sent).not.toHaveProperty(amount);
    }
  });

  it("returns the order from the envelope", async () => {
    mockFetch({ data: order }, 201);
    await expect(createOrder(request)).resolves.toEqual(order);
  });

  it("rejects a 201 that is not shaped like an order", async () => {
    mockFetch({ data: { status: "awaiting_payment" } }, 201);
    await expect(createOrder(request)).rejects.toBeInstanceOf(ApiError);
  });

  it("keeps a 409's body for the caller to read", async () => {
    const conflict = {
      message: "Some items are no longer available",
      errors: [
        { slug: "midnight-bloom", size: "S", reason: "insufficient_stock", available: 2 },
      ],
    };
    mockFetch(conflict, 409);
    await expect(createOrder(request)).rejects.toMatchObject({ status: 409, body: conflict });
  });
});

// A 409 carries an ARRAY of failing lines and a 422 an OBJECT keyed by field
// path. Reading them through these two keeps that difference in one place.
describe("telling the two failure shapes apart", () => {
  function failure(status: number, body: unknown) {
    return new ApiError(status, "failed", body);
  }

  const lines = [{ slug: "midnight-bloom", size: "S", reason: "unavailable" as const }];
  const fields = { email: ["The email field must be a valid email address."] };

  it("reads the failing lines out of a 409", () => {
    expect(conflictLines(failure(409, { message: "nope", errors: lines }))).toEqual(lines);
  });

  it("does not mistake a 422 for a conflict", () => {
    expect(conflictLines(failure(422, { message: "nope", errors: fields }))).toBeNull();
  });

  it("reads the field errors out of a 422", () => {
    expect(fieldErrors(failure(422, { message: "nope", errors: fields }))).toEqual(fields);
  });

  it("does not mistake a 409's array for field errors", () => {
    expect(fieldErrors(failure(409, { message: "nope", errors: lines }))).toBeNull();
  });

  it("ignores a failure that is not from the API at all", () => {
    expect(conflictLines(new Error("offline"))).toBeNull();
    expect(fieldErrors(new Error("offline"))).toBeNull();
  });

  it("ignores a response of the right status but the wrong shape", () => {
    expect(conflictLines(failure(409, { message: "nope" }))).toBeNull();
    expect(fieldErrors(failure(422, null))).toBeNull();
  });
});
