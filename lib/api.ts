import type {
  CartConflict,
  CartLine,
  CartReconcile,
  CreateOrderRequest,
  Order,
  ReconcileCartRequest,
  Single,
  ValidationError,
} from "./api-types";

/**
 * The storefront's client for the admin API.
 *
 * The base URL is deliberately public. The API has no authentication at all —
 * it decides who may call it from the request's Origin, against the admin's
 * `STOREFRONT_ORIGINS` allowlist — which means the browser is the intended
 * caller and there is no secret in the URL to protect. If a signed endpoint is
 * ever added, its key goes in a server-only variable: anything named
 * `NEXT_PUBLIC_*` is compiled into the bundle and is readable by everyone.
 *
 * Nothing here runs when the variable is unset, which is how the shop renders
 * from the local fixture during design work and in the tests.
 */
export function apiBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  // Trailing slashes would double up against the paths below.
  return raw ? raw.replace(/\/+$/, "") : null;
}

/** The API's own limits on a cart, enforced here as well as in `lib/cart`. */
export const MAX_CART_LINES = 20;
export const MAX_LINE_QTY = 10;

/**
 * The field lengths `POST /orders` accepts.
 *
 * These drive the form's own `maxLength` attributes, so an over-long value is
 * never typed rather than being typed and then rejected by the server.
 */
export const ORDER_LIMITS = {
  email: 190,
  firstName: 80,
  lastName: 80,
  address1: 190,
  address2: 190,
  city: 120,
  postcode: 32,
  country: 80,
  phone: 40,
  discountCode: 40,
  customerNote: 1000,
} as const;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Status 0 means the call never reached the API: no base URL, or the network failed. */
export class ApiUnreachable extends ApiError {
  constructor(message: string) {
    super(0, message);
    this.name = "ApiUnreachable";
  }
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const base = apiBase();
  if (!base) throw new ApiUnreachable("NEXT_PUBLIC_API_URL is not set");

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    // An aborted request is the caller's own doing, so let it through as-is for
    // the caller to recognise; everything else is a dead network.
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiUnreachable(`POST ${path} could not be reached`);
  }

  // A 4xx or 5xx may still carry a useful body (a 422's field errors, a 409's
  // line conflicts), so read it either way and hand it to the caller.
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, `POST ${path} answered ${res.status}`, payload);
  return payload as T;
}

/**
 * Prices and stock-checks a whole cart in one call.
 *
 * The response is the only thing a cart row should render from: it carries the
 * name, image, remaining sizes, unit price and line total, so the storefront
 * never fetches each product separately to draw one cart.
 */
export async function reconcileCart(
  items: CartLine[],
  options: { discountCode?: string; signal?: AbortSignal } = {},
): Promise<CartReconcile> {
  if (items.length === 0) throw new ApiError(0, "A cart must have at least one line");

  const body: ReconcileCartRequest = { items };
  if (options.discountCode) body.discountCode = options.discountCode;

  const payload = await postJson<Single<CartReconcile>>(
    "/cart/reconcile",
    body,
    options.signal,
  );

  // Check the envelope before handing it to a component. A wrong shape here
  // otherwise surfaces as a crash deep in render, pointing at the wrong thing.
  const data = payload?.data;
  if (!data || !Array.isArray(data.lines) || typeof data.totals?.total !== "number") {
    throw new ApiError(200, "POST /cart/reconcile answered in an unexpected shape", payload);
  }
  return data;
}

/**
 * Places the order. One transaction at the other end: either all of it
 * happened or none of it did.
 *
 * The response's figures are the authoritative ones and the order keeps them
 * forever, so a confirmation renders them and never recomputes them.
 */
export async function createOrder(
  order: CreateOrderRequest,
  signal?: AbortSignal,
): Promise<Order> {
  const payload = await postJson<Single<Order>>("/orders", order, signal);

  const data = payload?.data;
  if (!data || typeof data.orderNumber !== "string" || !Array.isArray(data.items)) {
    throw new ApiError(201, "POST /orders answered in an unexpected shape", payload);
  }
  return data;
}

/**
 * The failing lines from a 409, or null if this was some other failure.
 *
 * A 409 is not a validation failure: nothing the customer typed is wrong and
 * the same request would have worked a minute earlier, so it is worth telling
 * them apart. Note `errors` is an ARRAY here and an object on a 422 — the
 * reason both shapes are read through a function instead of by hand.
 */
export function conflictLines(error: unknown): CartConflict["errors"] | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const body = error.body as CartConflict | null;
  return Array.isArray(body?.errors) ? body.errors : null;
}

/** The field errors from a 422, keyed by field path, or null for anything else. */
export function fieldErrors(error: unknown): ValidationError["errors"] | null {
  if (!(error instanceof ApiError) || error.status !== 422) return null;
  const errors = (error.body as ValidationError | null)?.errors;
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return null;
  return errors;
}
