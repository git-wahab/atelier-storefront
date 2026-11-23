/**
 * The storefront API contract, transcribed from `Storefont API.md`.
 *
 * These types mirror the API exactly, including its nullability. Where the API
 * says `string | null`, so does this file — a type that is narrower than the
 * payload is a runtime crash wearing a compile-time disguise.
 *
 * Two deliberate departures from the document, both naming only:
 *
 * - its `Image` is `Img` here, because components import `Image` from
 *   `next/image` and the collision is not worth the fidelity.
 * - its `Collection` is `CollectionDetail`, to keep the card/detail pair named
 *   the way the product pair is.
 */

/** Integer minor units: 12000 is $120.00. Never a decimal, anywhere. */
export type Minor = number;

// ---------------------------------------------------------------- media

/** `width` and `height` are always null on a collection hero, which stores only a path. */
export type Img = {
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
};

/**
 * Not `Img & {…}`: the API's figure shape carries no dimensions, and `position`
 * is a focal point that only figures have. Gallery images always fall back.
 */
export type Figure = {
  src: string;
  alt: string;
  caption: string | null;
  note: string | null;
  ratio: "3/4" | "1/1" | "4/5" | null;
  plain: boolean;
  position: string | null;
};

// ---------------------------------------------------------------- products

export type Variant = { size: string; inStock: boolean; price: Minor };

/**
 * What `GET /products` returns per row. Card fields only — `description`,
 * `story`, `variants`, `gallery` and `figures` come from the single-product
 * shape, because the full payload would ship most of a megabyte of story copy
 * the grid never displays.
 *
 * `nameTail` is the only nullable copy field: the admin requires the rest.
 */
export type ProductCard = {
  slug: string;
  name: string;
  nameLead: string;
  nameTail: string | null;
  number: string;
  fleece: string;
  /** 7-character hex, e.g. "#C98763". */
  dot: string;
  threads: string;
  short: string;
  motif: string;
  motifNote: string;
  price: Minor;
  currency: string;
  isFeatured: boolean;
  /** Rolled up from the variants. Advisory — behind a 5-minute cache. */
  inStock: boolean;
  hoodie: Img | null;
};

/**
 * What `GET /products/{slug}` returns. `related` and `collections` arrive
 * resolved, so a product page is one round trip.
 *
 * `artHeading` and `closeHeading` are one OR two lines with empty parts
 * filtered out — not a fixed pair. Index 1 may be undefined at runtime.
 */
export type Product = ProductCard & {
  description: string;
  story: string;
  artHeading: string[];
  closeHeading: string[];
  pair: string | null;
  /** This product's sizes, in picker order. Build the picker from this, never from Settings. */
  sizes: string[];
  variants: Variant[];
  gallery: Img[];
  figures: Figure[];
  collections: CollectionRef[];
  related: ProductCard[];
};

// ---------------------------------------------------------------- collections

export type CollectionRef = { slug: string; name: string };

export type CollectionCard = {
  slug: string;
  name: string;
  nameLead: string;
  nameTail: string | null;
  short: string;
  heroImage: Img | null;
  /** Published members only. */
  productCount: number;
};

/** `GET /collections/{slug}`. Its `meta`/`links` describe `products`, not the collection. */
export type CollectionDetail = CollectionCard & {
  description: string | null;
  products: ProductCard[];
};

// ---------------------------------------------------------------- content

/** The API's keys are `question`/`answer`, not the `q`/`a` this project used. */
export type Faq = { question: string; answer: string };

/**
 * Every value is nullable: the Settings screen can be half-filled. Guard at the
 * render site or supply a fallback — `currencySymbol` reaching `money()` as
 * null would print "null120.00".
 */
export type Settings = {
  brandName: string | null;
  currency: string | null;
  currencySymbol: string | null;
  /** Minor units. Reference only — POST /orders is authoritative. */
  shippingFlat: Minor | null;
  /** Basis points: 850 is 8.5%. Reference only. */
  taxRateBp: number | null;
  /** The catalogue-wide union. NOT this product's sizes, and NOT availability. */
  sizes: string[];
  notes: Record<
    | "shipping"
    | "returns"
    | "fabric"
    | "fit"
    | "care"
    | "sizeGuide"
    | "delivery"
    | "deliveryMethods"
    | "embroidery",
    string | null
  >;
  contact: Record<
    "email" | "instagram" | "otherSocial" | "hours" | "responseTime",
    string | null
  >;
};

// ---------------------------------------------------------------- cart & orders

/** Exactly what `localStorage` holds under `luxCart`, and what checkout posts. */
export type CartLine = { slug: string; size: string; qty: number };

export type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "shipped"
  | "cancelled"
  | "refunded";

export type OrderItem = {
  slug: string;
  /** Snapshotted at purchase, so a later rename leaves this order as it was sold. */
  name: string;
  size: string;
  qty: number;
  unitPrice: Minor;
  lineTotal: Minor;
};

/**
 * `POST /orders` and `POST /orders/lookup` return this same shape.
 *
 * Note `shipping` is the delivery CHARGE, not an address — the response carries
 * no address at all, so a confirmation page renders it from submitted state.
 */
export type Order = {
  orderNumber: string;
  status: OrderStatus;
  email: string;
  subtotal: Minor;
  discount: Minor;
  shipping: Minor;
  tax: Minor;
  total: Minor;
  currency: string;
  /** False when the code went stale between cart and checkout. The order still succeeded, at full price. */
  discountApplied: boolean;
  discountCode: string | null;
  items: OrderItem[];
  paymentInstructions: string;
  shippedAt: string | null;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  createdAt: string;
};

/** The request body for `POST /orders`. Flat, and no amounts: the server prices everything. */
export type CreateOrderRequest = {
  items: CartLine[];
  email: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  postcode: string;
  /** Free text up to 80 characters, e.g. "United Kingdom" — not an ISO code. */
  country: string;
  phone?: string;
  discountCode?: string;
  customerNote?: string;
};

// ---------------------------------------------------------------- discounts

export type DiscountRejection =
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "exhausted"
  | "below_minimum";

/** A discriminated union on `valid`. Always a 200 — check the body, not the status. */
export type DiscountCheck =
  | {
      valid: true;
      code: string;
      type: "percent" | "fixed";
      discount: Minor;
      /** Written for a shopper and already formatted in the shop's currency. */
      message: string;
    }
  | {
      valid: false;
      reason: DiscountRejection;
      message: string;
    };

// ---------------------------------------------------------------- cart reconcile

/**
 * Why a line cannot be bought as asked.
 *
 * The middle two match `CartConflict.reason` from `POST /orders`: reconcile is
 * that same judgement made early, so the shopper sees it in the cart instead of
 * at the end of checkout. `gone` has no checkout equivalent — the product has
 * stopped being sold, so the order endpoint would reject the slug outright.
 */
export type LineStatus = "ok" | "insufficient_stock" | "unavailable" | "gone";

/** One cart line, judged against live stock and priced by the server. */
export type ReconciledLine = {
  slug: string;
  size: string;
  /** What the shopper asked for, echoed back unchanged. */
  qty: number;
  /** What can actually be sold today. Zero on `unavailable` and `gone`. */
  buyableQty: number;
  status: LineStatus;
  /** The stock left, on `insufficient_stock` only; null on every other status. */
  available: number | null;
  /** Null on `gone`: the product no longer exists to be named. */
  name: string | null;
  /** Null on `gone`. An absolute URL on the admin host, so `next/image` needs that host allowed. */
  image: Img | null;
  /** The sizes still sold, for an `unavailable` line to offer instead. Empty on `gone`. */
  sizes: string[];
  /** Null whenever nothing on this line is buyable. */
  unitPrice: Minor | null;
  /**
   * Prices `buyableQty`, NOT `qty`. A line asking for 5 with 2 in stock totals
   * 2 x unitPrice, so never recompute this as qty x unitPrice.
   */
  lineTotal: Minor;
};

/** Priced by the server, by the same formula the order endpoint uses. */
export type CartTotals = {
  /** The sum of every `lineTotal`, so unbuyable quantity is already excluded. */
  subtotal: Minor;
  discount: Minor;
  shipping: Minor;
  /** round((subtotal - discount) x taxRateBp / 10000). */
  tax: Minor;
  /** (subtotal - discount) + tax + shipping. */
  total: Minor;
  currency: string;
};

/** The request body for `POST /cart/reconcile`: 1-20 lines, each `qty` 1-10. */
export type ReconcileCartRequest = {
  items: CartLine[];
  discountCode?: string;
};

/**
 * `POST /cart/reconcile`. The cart's one source of truth for names, images,
 * stock and money — everything a cart row needs, so the storefront never has
 * to fetch each product separately to render one.
 */
export type CartReconcile = {
  lines: ReconciledLine[];
  /**
   * False when any line is short or gone. Checkout would answer 409, so the
   * order button waits until the shopper has adjusted those lines.
   */
  payable: boolean;
  /** Null when no code was sent. The valid arm is shaped exactly like `/discounts/validate`. */
  discount: DiscountCheck | null;
  totals: CartTotals;
};

// ---------------------------------------------------------------- envelopes

export type Single<T> = { data: T };

export type Paginated<T> = {
  data: T[];
  meta: { page: number; perPage: number; total: number; lastPage: number };
  links: { next: string | null };
};

/** The two form endpoints answer with this instead of a `data` envelope. */
export type Accepted = { ok: true };

// ---------------------------------------------------------------- failures

/** A 422. `errors` is keyed by field path, indexed AFTER duplicate lines were summed. */
export type ValidationError = {
  message: string;
  errors: Record<string, string[]>;
};

/**
 * A 409 from `POST /orders`. Nothing was written.
 *
 * `errors` is an ARRAY here, not the object a 422 returns — the status tells
 * you which shape you have.
 */
export type CartConflict = {
  message: string;
  errors: {
    slug: string;
    size: string;
    reason: "insufficient_stock" | "unavailable";
    /** Present only on `insufficient_stock`. */
    available?: number;
  }[];
};
