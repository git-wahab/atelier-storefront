import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const BASE = "https://admin.example.test/api/v1";
let base: string | null = BASE;

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiBase: () => base, reconcileCart: vi.fn() };
});

import { ApiUnreachable, reconcileCart } from "@/lib/api";
import type { CartReconcile } from "@/lib/api-types";
import type { CartItem } from "@/lib/cart";
import { useReconcile } from "@/lib/use-reconcile";

const items: CartItem[] = [{ slug: "whispering-crane-bird", size: "M", qty: 1 }];

function reconcile(total: number): CartReconcile {
  return {
    lines: [],
    payable: true,
    discount: null,
    totals: { subtotal: total, discount: 0, shipping: 0, tax: 0, total, currency: "USD" },
  };
}

beforeEach(() => {
  base = BASE;
  vi.mocked(reconcileCart).mockResolvedValue(reconcile(12000));
});

describe("when there is nothing to ask", () => {
  it("stays off with no API configured, and never calls out", () => {
    base = null;
    const { result } = renderHook(() => useReconcile(items, { delay: 0 }));
    expect(result.current.kind).toBe("off");
    expect(reconcileCart).not.toHaveBeenCalled();
  });

  it("stays off for an empty cart, which the API would reject", () => {
    const { result } = renderHook(() => useReconcile([], { delay: 0 }));
    expect(result.current.kind).toBe("off");
    expect(reconcileCart).not.toHaveBeenCalled();
  });

  it("goes off again when the last line is removed", async () => {
    const { result, rerender } = renderHook(
      ({ cart }: { cart: CartItem[] }) => useReconcile(cart, { delay: 0 }),
      { initialProps: { cart: items } },
    );
    await waitFor(() => expect(result.current.kind).toBe("ready"));
    rerender({ cart: [] });
    expect(result.current.kind).toBe("off");
    expect(result.current.data).toBeNull();
  });
});

describe("asking", () => {
  it("starts out loading, with nothing to show yet", () => {
    const { result } = renderHook(() => useReconcile(items, { delay: 0 }));
    expect(result.current.kind).toBe("loading");
    expect(result.current.data).toBeNull();
  });

  it("ends up ready, holding the answer", async () => {
    const { result } = renderHook(() => useReconcile(items, { delay: 0 }));
    await waitFor(() => expect(result.current.kind).toBe("ready"));
    expect(result.current.data?.totals.total).toBe(12000);
  });

  it("asks again when a quantity changes", async () => {
    const { result, rerender } = renderHook(
      ({ cart }: { cart: CartItem[] }) => useReconcile(cart, { delay: 0 }),
      { initialProps: { cart: items } },
    );
    await waitFor(() => expect(result.current.kind).toBe("ready"));

    vi.mocked(reconcileCart).mockResolvedValue(reconcile(24000));
    rerender({ cart: [{ ...items[0], qty: 2 }] });
    await waitFor(() => expect(result.current.data?.totals.total).toBe(24000));
  });

  it("does not ask again when the cart is only handed back as a new array", async () => {
    const { result, rerender } = renderHook(
      ({ cart }: { cart: CartItem[] }) => useReconcile(cart, { delay: 0 }),
      { initialProps: { cart: items } },
    );
    await waitFor(() => expect(result.current.kind).toBe("ready"));
    // The provider builds a fresh array on every render; the contents decide.
    rerender({ cart: [{ ...items[0] }] });
    rerender({ cart: [{ ...items[0] }] });
    expect(reconcileCart).toHaveBeenCalledTimes(1);
  });

  it("keeps the last answer on screen while the next one is in flight", async () => {
    const { result, rerender } = renderHook(
      ({ cart }: { cart: CartItem[] }) => useReconcile(cart, { delay: 0 }),
      { initialProps: { cart: items } },
    );
    await waitFor(() => expect(result.current.kind).toBe("ready"));
    rerender({ cart: [{ ...items[0], qty: 3 }] });
    expect(result.current.kind).toBe("loading");
    expect(result.current.data?.totals.total).toBe(12000);
  });

  it("coalesces a burst of edits into one call", async () => {
    const { result, rerender } = renderHook(
      ({ cart }: { cart: CartItem[] }) => useReconcile(cart),
      { initialProps: { cart: items } },
    );
    // Four quantities inside the debounce window: only the last one is asked.
    for (const qty of [2, 3, 4, 5]) rerender({ cart: [{ ...items[0], qty }] });
    await waitFor(() => expect(result.current.kind).toBe("ready"));
    expect(reconcileCart).toHaveBeenCalledTimes(1);
    expect(reconcileCart).toHaveBeenCalledWith(
      [{ slug: "whispering-crane-bird", size: "M", qty: 5 }],
      expect.anything(),
    );
  });
});

describe("when it fails", () => {
  it("reports an unreachable shop in words a shopper can read", async () => {
    vi.mocked(reconcileCart).mockRejectedValue(new ApiUnreachable("no base url"));
    const { result } = renderHook(() => useReconcile(items, { delay: 0 }));
    await waitFor(() => expect(result.current.kind).toBe("error"));
    expect(result.current.message).toMatch(/could not reach the shop/i);
  });

  it("keeps the last good answer, so a dropped connection does not empty the cart", async () => {
    const { result, rerender } = renderHook(
      ({ cart }: { cart: CartItem[] }) => useReconcile(cart, { delay: 0 }),
      { initialProps: { cart: items } },
    );
    await waitFor(() => expect(result.current.kind).toBe("ready"));

    vi.mocked(reconcileCart).mockRejectedValue(new ApiUnreachable("offline"));
    rerender({ cart: [{ ...items[0], qty: 2 }] });
    await waitFor(() => expect(result.current.kind).toBe("error"));
    expect(result.current.data?.totals.total).toBe(12000);
  });

  it("recovers on the next edit", async () => {
    vi.mocked(reconcileCart).mockRejectedValue(new ApiUnreachable("offline"));
    const { result, rerender } = renderHook(
      ({ cart }: { cart: CartItem[] }) => useReconcile(cart, { delay: 0 }),
      { initialProps: { cart: items } },
    );
    await waitFor(() => expect(result.current.kind).toBe("error"));

    vi.mocked(reconcileCart).mockResolvedValue(reconcile(24000));
    rerender({ cart: [{ ...items[0], qty: 2 }] });
    await waitFor(() => expect(result.current.kind).toBe("ready"));
    expect(result.current.message).toBeNull();
  });
});
