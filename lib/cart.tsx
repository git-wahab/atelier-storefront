"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MAX_CART_LINES, MAX_LINE_QTY } from "./api";

export type CartItem = { slug: string; size: string; qty: number };

/**
 * What `add` did. The API accepts 1-20 lines with a quantity of 1-10 each and
 * answers 422 outside that, so the cart refuses here instead of letting the
 * shopper find out at checkout.
 */
export type AddResult = "added" | "full" | "max";

type CartContextValue = {
  items: CartItem[];
  /** False until the saved cart has been read in the browser. */
  ready: boolean;
  count: number;
  add: (slug: string, size: string) => AddResult;
  setQty: (slug: string, size: string, qty: number) => void;
  remove: (slug: string, size: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "luxCart";
const CartContext = createContext<CartContextValue | null>(null);

function read(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  // Load once on the client, and keep other tabs in sync.
  useEffect(() => {
    setItems(read());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage can be blocked; the cart then lasts for this visit only */
    }
  }, [items, ready]);

  const add = useCallback(
    (slug: string, size: string): AddResult => {
      const hit = items.find((i) => i.slug === slug && i.size === size);
      if (!hit && items.length >= MAX_CART_LINES) return "full";
      if (hit && hit.qty >= MAX_LINE_QTY) return "max";

      setItems((prev) => {
        const line = prev.find((i) => i.slug === slug && i.size === size);
        if (line) {
          // Clamp again inside the update: two adds in one tick both read the
          // same `items`, and only this callback sees the quantity that won.
          return prev.map((i) =>
            i === line ? { ...i, qty: Math.min(MAX_LINE_QTY, i.qty + 1) } : i,
          );
        }
        return prev.length >= MAX_CART_LINES ? prev : [...prev, { slug, size, qty: 1 }];
      });
      return "added";
    },
    [items],
  );

  const setQty = useCallback((slug: string, size: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.slug === slug && i.size === size
          ? { ...i, qty: Math.min(MAX_LINE_QTY, Math.max(1, qty)) }
          : i,
      ),
    );
  }, []);

  const remove = useCallback((slug: string, size: string) => {
    setItems((prev) => prev.filter((i) => !(i.slug === slug && i.size === size)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      count: items.reduce((n, i) => n + i.qty, 0),
      add,
      setQty,
      remove,
      clear,
    }),
    [items, ready, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
