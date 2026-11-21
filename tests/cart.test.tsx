import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CartProvider, useCart, type CartItem } from "@/lib/cart";

const KEY = "luxCart";

function mount() {
  return renderHook(() => useCart(), { wrapper: CartProvider });
}

function seed(items: CartItem[] | unknown) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

function stored(): unknown {
  return JSON.parse(window.localStorage.getItem(KEY) ?? "null");
}

describe("initial state", () => {
  it("starts empty when nothing is saved", () => {
    const { result } = mount();
    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("reports ready once the saved cart has been read", () => {
    const { result } = mount();
    expect(result.current.ready).toBe(true);
  });

  it("exposes the full API surface", () => {
    const { result } = mount();
    for (const key of ["items", "ready", "count", "add", "setQty", "remove", "clear"] as const) {
      expect(result.current).toHaveProperty(key);
    }
  });
});

describe("hydration from localStorage", () => {
  it("restores a saved cart", () => {
    seed([{ slug: "midnight-bloom", size: "M", qty: 2 }]);
    const { result } = mount();
    expect(result.current.items).toEqual([{ slug: "midnight-bloom", size: "M", qty: 2 }]);
    expect(result.current.count).toBe(2);
  });

  it("restores several lines in order", () => {
    seed([
      { slug: "midnight-bloom", size: "S", qty: 1 },
      { slug: "whispering-crane-bird", size: "L", qty: 3 },
    ]);
    const { result } = mount();
    expect(result.current.items.map((i) => i.slug)).toEqual([
      "midnight-bloom",
      "whispering-crane-bird",
    ]);
    expect(result.current.count).toBe(4);
  });

  it("falls back to empty on corrupt JSON", () => {
    window.localStorage.setItem(KEY, "{not json");
    const { result } = mount();
    expect(result.current.items).toEqual([]);
    expect(result.current.ready).toBe(true);
  });

  it("falls back to empty when the saved value is not an array", () => {
    for (const value of [{ slug: "x" }, 42, "a string", true, null] as const) {
      window.localStorage.setItem(KEY, JSON.stringify(value));
      const { result, unmount } = mount();
      expect(result.current.items, JSON.stringify(value)).toEqual([]);
      unmount();
    }
  });

  it("falls back to empty when storage cannot be read at all", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    const { result } = mount();
    expect(result.current.items).toEqual([]);
    expect(result.current.ready).toBe(true);
  });

  it("does not overwrite a saved cart with an empty one while hydrating", () => {
    seed([{ slug: "midnight-bloom", size: "M", qty: 2 }]);
    mount();
    expect(stored()).toEqual([{ slug: "midnight-bloom", size: "M", qty: 2 }]);
  });
});

describe("add", () => {
  it("adds a new line with quantity 1", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    expect(result.current.items).toEqual([{ slug: "midnight-bloom", size: "M", qty: 1 }]);
  });

  it("increments instead of duplicating the same slug and size", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    act(() => result.current.add("midnight-bloom", "M"));
    act(() => result.current.add("midnight-bloom", "M"));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].qty).toBe(3);
    expect(result.current.count).toBe(3);
  });

  it("keeps sizes of the same product as separate lines", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    act(() => result.current.add("midnight-bloom", "L"));
    expect(result.current.items).toHaveLength(2);
    expect(result.current.count).toBe(2);
  });

  it("keeps different products as separate lines", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    act(() => result.current.add("whispering-crane-bird", "M"));
    expect(result.current.items.map((i) => i.slug)).toEqual([
      "midnight-bloom",
      "whispering-crane-bird",
    ]);
  });

  it("appends new lines after existing ones", () => {
    const { result } = mount();
    act(() => result.current.add("a", "S"));
    act(() => result.current.add("b", "S"));
    act(() => result.current.add("a", "S"));
    expect(result.current.items).toEqual([
      { slug: "a", size: "S", qty: 2 },
      { slug: "b", size: "S", qty: 1 },
    ]);
  });
});

describe("setQty", () => {
  it("sets the quantity of a matching line", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    act(() => result.current.setQty("midnight-bloom", "M", 5));
    expect(result.current.items[0].qty).toBe(5);
    expect(result.current.count).toBe(5);
  });

  it("clamps to a minimum of 1, so a line never reaches zero", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    for (const qty of [0, -1, -999]) {
      act(() => result.current.setQty("midnight-bloom", "M", qty));
      expect(result.current.items[0].qty, String(qty)).toBe(1);
    }
  });

  it("only touches the line with the matching slug and size", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    act(() => result.current.add("midnight-bloom", "L"));
    act(() => result.current.setQty("midnight-bloom", "M", 4));
    expect(result.current.items).toEqual([
      { slug: "midnight-bloom", size: "M", qty: 4 },
      { slug: "midnight-bloom", size: "L", qty: 1 },
    ]);
  });

  it("is a no-op for a line that is not in the cart", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    act(() => result.current.setQty("nope", "XL", 9));
    expect(result.current.items).toEqual([{ slug: "midnight-bloom", size: "M", qty: 1 }]);
  });

  // Math.max does not round: the quantity input is type=number, so this
  // documents what reaches state if a fractional value ever gets through.
  it("does not round fractional quantities", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    act(() => result.current.setQty("midnight-bloom", "M", 2.5));
    expect(result.current.items[0].qty).toBe(2.5);
  });
});

describe("remove", () => {
  it("removes the matching line", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    act(() => result.current.remove("midnight-bloom", "M"));
    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("removes only the matching size", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    act(() => result.current.add("midnight-bloom", "L"));
    act(() => result.current.remove("midnight-bloom", "M"));
    expect(result.current.items).toEqual([{ slug: "midnight-bloom", size: "L", qty: 1 }]);
  });

  it("removes the whole line regardless of its quantity", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    act(() => result.current.setQty("midnight-bloom", "M", 7));
    act(() => result.current.remove("midnight-bloom", "M"));
    expect(result.current.items).toEqual([]);
  });

  it("is a no-op for a line that is not in the cart", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    act(() => result.current.remove("midnight-bloom", "XL"));
    expect(result.current.items).toHaveLength(1);
  });
});

describe("clear", () => {
  it("empties a full cart", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    act(() => result.current.add("whispering-crane-bird", "L"));
    act(() => result.current.clear());
    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("is safe on an already empty cart", () => {
    const { result } = mount();
    act(() => result.current.clear());
    expect(result.current.items).toEqual([]);
  });
});

describe("count", () => {
  it("sums quantities rather than counting lines", () => {
    const { result } = mount();
    act(() => result.current.add("a", "S"));
    act(() => result.current.add("a", "S"));
    act(() => result.current.add("b", "M"));
    expect(result.current.items).toHaveLength(2);
    expect(result.current.count).toBe(3);
  });
});

describe("persistence", () => {
  it("writes the cart under the luxCart key", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    expect(stored()).toEqual([{ slug: "midnight-bloom", size: "M", qty: 1 }]);
  });

  it("persists every mutation", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    act(() => result.current.setQty("midnight-bloom", "M", 3));
    expect(stored()).toEqual([{ slug: "midnight-bloom", size: "M", qty: 3 }]);
    act(() => result.current.remove("midnight-bloom", "M"));
    expect(stored()).toEqual([]);
  });

  it("survives a remount", () => {
    const first = mount();
    act(() => first.result.current.add("midnight-bloom", "M"));
    first.unmount();
    const second = mount();
    expect(second.result.current.items).toEqual([{ slug: "midnight-bloom", size: "M", qty: 1 }]);
  });

  it("keeps working when writing to storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const { result } = mount();
    expect(() => act(() => result.current.add("midnight-bloom", "M"))).not.toThrow();
    expect(result.current.items).toHaveLength(1);
  });
});

describe("cross-tab sync", () => {
  it("picks up a cart saved by another tab", () => {
    const { result } = mount();
    act(() => {
      seed([{ slug: "whispering-crane-bird", size: "XL", qty: 2 }]);
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });
    expect(result.current.items).toEqual([
      { slug: "whispering-crane-bird", size: "XL", qty: 2 },
    ]);
  });

  it("ignores storage events for other keys", () => {
    const { result } = mount();
    act(() => result.current.add("midnight-bloom", "M"));
    act(() => {
      window.localStorage.setItem("somethingElse", "[]");
      window.dispatchEvent(new StorageEvent("storage", { key: "somethingElse" }));
    });
    expect(result.current.items).toEqual([{ slug: "midnight-bloom", size: "M", qty: 1 }]);
  });

  it("stops listening after unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    mount().unmount();
    expect(remove).toHaveBeenCalledWith("storage", expect.any(Function));
  });
});

describe("useCart outside the provider", () => {
  it("throws a message naming the missing provider", () => {
    const onError = vi.spyOn(console, "error").mockImplementation(() => {});
    function Orphan() {
      useCart();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/useCart must be used inside <CartProvider>/);
    onError.mockRestore();
  });
});

describe("provider rendering", () => {
  it("renders its children", () => {
    render(
      <CartProvider>
        <p>cart child</p>
      </CartProvider>,
    );
    expect(screen.getByText("cart child")).toBeInTheDocument();
  });
});
