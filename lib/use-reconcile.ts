"use client";

import { useEffect, useState } from "react";
import { ApiError, apiBase, reconcileCart } from "./api";
import type { CartReconcile } from "./api-types";
import type { CartItem } from "./cart";

/**
 * Where the cart's prices and stock come from.
 *
 * - `off`    — no API configured, or an empty cart. The caller prices the cart
 *              from the local fixture and names no total, as it did before any
 *              of this existed.
 * - `loading` — a call is in flight. `data` still holds the last good answer
 *              during a refresh, so quantities can change without the summary
 *              blinking out; it is null only on the very first call.
 * - `ready`  — `data` is current.
 * - `error`  — the call failed. `data` holds the last good answer if there was
 *              one, so a dropped connection does not empty the cart.
 */
export type ReconcileState = {
  kind: "off" | "loading" | "ready" | "error";
  data: CartReconcile | null;
  message: string | null;
};

/** Identity changes on every cart edit, so compare the contents instead. */
function signature(items: CartItem[], discountCode: string | undefined): string {
  return JSON.stringify([items.map((i) => [i.slug, i.size, i.qty]), discountCode ?? ""]);
}

function describe(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "We could not reach the shop to check stock and prices.";
    if (error.status === 422) return "The shop could not read this cart.";
    return "The shop could not price this cart just now.";
  }
  return "Something went wrong checking this cart.";
}

/**
 * Reconciles the cart against the API whenever its contents change.
 *
 * Edits are coalesced: holding down "one more" produces one call, not one per
 * click, and any call still in flight is abandoned when the cart changes again.
 * `POST /cart/reconcile` has no published rate limit, so this keeps the traffic
 * to roughly one call per pause rather than one per keystroke.
 */
export function useReconcile(
  items: CartItem[],
  options: { discountCode?: string; delay?: number } = {},
): ReconcileState {
  const { discountCode, delay = 250 } = options;
  const configured = apiBase() !== null;
  const idle = !configured || items.length === 0;

  const [state, setState] = useState<ReconcileState>({
    kind: idle ? "off" : "loading",
    data: null,
    message: null,
  });

  const key = signature(items, discountCode);

  useEffect(() => {
    if (idle) {
      setState({ kind: "off", data: null, message: null });
      return;
    }

    const controller = new AbortController();
    // Keep whatever is on screen and mark it stale, rather than emptying it.
    setState((prev) => ({ kind: "loading", data: prev.data, message: null }));

    const timer = setTimeout(() => {
      reconcileCart(items, { discountCode, signal: controller.signal })
        .then((data) => setState({ kind: "ready", data, message: null }))
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setState((prev) => ({ kind: "error", data: prev.data, message: describe(error) }));
        });
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `key` stands in for `items` and `discountCode`: the provider hands us a
    // fresh array on every render, which as a dependency would never settle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, idle, delay]);

  return state;
}
