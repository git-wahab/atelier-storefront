import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import ProductBuy from "@/components/ProductBuy";
import { CartProvider } from "@/lib/cart";
import { money, notes, priceOf, sizes } from "@/lib/config";
import { products } from "@/lib/products";

const product = products[0];

function setup(p = product) {
  const user = userEvent.setup();
  const view = render(
    <CartProvider>
      <ProductBuy product={p} />
    </CartProvider>,
  );
  const live = () => view.container.querySelector('[aria-live="polite"]')!;
  const sizeButton = (s: string) => screen.getByRole("button", { name: s });
  const addButton = () => screen.getByRole("button", { name: "Add to cart" });
  return { user, live, sizeButton, addButton, ...view };
}

function savedCart() {
  return JSON.parse(window.localStorage.getItem("luxCart") ?? "[]");
}

beforeEach(() => window.localStorage.clear());

describe("product information", () => {
  it("shows the design number and fleece colour", () => {
    setup();
    expect(
      screen.getByText(`Design ${product.number} · ${product.fleece} fleece`),
    ).toBeInTheDocument();
  });

  it("renders the name as a level-one heading", () => {
    setup();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(product.name);
  });

  it("sets the tail of the name apart for the italic accent", () => {
    const { container } = setup();
    expect(container.querySelector("h1 em")).toHaveTextContent(product.nameTail);
  });

  it("shows the formatted price", () => {
    setup();
    expect(screen.getByText(money(priceOf(product.slug)))).toBeInTheDocument();
  });

  it("shows the thread colours and a dot in the thread colour", () => {
    const { container } = setup();
    expect(screen.getByText(product.threads)).toBeInTheDocument();
    const dot = container.querySelector("i");
    expect(dot).toHaveStyle({ background: product.dot });
  });

  it("shows the description", () => {
    setup();
    expect(screen.getByText(product.description)).toBeInTheDocument();
  });

  it("shows the shipping and returns note", () => {
    setup();
    expect(screen.getByText(`${notes.shipping} · ${notes.returns}`)).toBeInTheDocument();
  });

  it("renders the second product's own details too", () => {
    setup(products[1]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(products[1].name);
    expect(screen.getByText(products[1].threads)).toBeInTheDocument();
  });
});

describe("size picker", () => {
  it("offers every configured size", () => {
    setup();
    for (const s of sizes) expect(screen.getByRole("button", { name: s })).toBeInTheDocument();
  });

  it("starts with no size selected", () => {
    setup();
    for (const s of sizes) expect(screen.getByRole("button", { name: s })).toHaveAttribute("aria-pressed", "false");
  });

  it("marks the chosen size as pressed", async () => {
    const { user, sizeButton } = setup();
    await user.click(sizeButton("M"));
    expect(sizeButton("M")).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps only one size pressed at a time", async () => {
    const { user, sizeButton } = setup();
    await user.click(sizeButton("M"));
    await user.click(sizeButton("L"));
    expect(sizeButton("L")).toHaveAttribute("aria-pressed", "true");
    expect(sizeButton("M")).toHaveAttribute("aria-pressed", "false");
  });

  it("labels the group so the control is announced", () => {
    setup();
    expect(screen.getByText("Size")).toBeInTheDocument();
  });
});

describe("add to cart", () => {
  it("refuses to add without a size and says why", async () => {
    const { user, addButton, live } = setup();
    await user.click(addButton());
    expect(live()).toHaveTextContent("Choose a size first");
    expect(savedCart()).toEqual([]);
  });

  it("clears the warning once a size is chosen", async () => {
    const { user, addButton, sizeButton, live } = setup();
    await user.click(addButton());
    expect(live()).toHaveTextContent("Choose a size first");
    await user.click(sizeButton("M"));
    expect(live()).not.toHaveTextContent("Choose a size first");
  });

  it("adds the chosen size to the cart", async () => {
    const { user, addButton, sizeButton } = setup();
    await user.click(sizeButton("L"));
    await user.click(addButton());
    expect(savedCart()).toEqual([{ slug: product.slug, size: "L", qty: 1 }]);
  });

  it("confirms the addition with the running cart count", async () => {
    const { user, addButton, sizeButton, live } = setup();
    await user.click(sizeButton("L"));
    await user.click(addButton());
    expect(live()).toHaveTextContent("Added");
    expect(live()).toHaveTextContent("1 in cart");
  });

  it("updates the count when the same size is added again", async () => {
    const { user, addButton, sizeButton, live } = setup();
    await user.click(sizeButton("L"));
    await user.click(addButton());
    await user.click(addButton());
    expect(live()).toHaveTextContent("2 in cart");
    expect(savedCart()).toEqual([{ slug: product.slug, size: "L", qty: 2 }]);
  });

  it("adds a second line when the size changes", async () => {
    const { user, addButton, sizeButton } = setup();
    await user.click(sizeButton("S"));
    await user.click(addButton());
    await user.click(sizeButton("XL"));
    await user.click(addButton());
    expect(savedCart()).toEqual([
      { slug: product.slug, size: "S", qty: 1 },
      { slug: product.slug, size: "XL", qty: 1 },
    ]);
  });

  it("offers a link to the cart after adding", async () => {
    const { user, addButton, sizeButton } = setup();
    await user.click(sizeButton("M"));
    await user.click(addButton());
    expect(screen.getByRole("link", { name: "View cart" })).toHaveAttribute("href", "/cart");
  });

  it("shows no confirmation before anything is added", () => {
    const { live } = setup();
    expect(live()).toBeEmptyDOMElement();
  });

  it("never shows the warning and the confirmation together", async () => {
    const { user, addButton, sizeButton, live } = setup();
    await user.click(addButton());
    await user.click(sizeButton("M"));
    await user.click(addButton());
    expect(live()).toHaveTextContent("Added");
    expect(live()).not.toHaveTextContent("Choose a size first");
  });
});

describe("details accordion", () => {
  const titles = ["Details", "Size and fit", "Delivery and returns"];

  it("renders a toggle for each section", () => {
    setup();
    for (const t of titles) expect(screen.getByRole("button", { name: new RegExp(t) })).toBeInTheDocument();
  });

  it("opens the first section by default", () => {
    setup();
    expect(screen.getByRole("button", { name: /Details/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Size and fit/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the open section when it is clicked again", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /Details/ }));
    expect(screen.getByRole("button", { name: /Details/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps only one section open at a time", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /Size and fit/ }));
    expect(screen.getByRole("button", { name: /Size and fit/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Details/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the open section's body and hides the others", async () => {
    const { user } = setup();
    expect(screen.getByText(new RegExp(notes.fabric.replace(/[[\]]/g, "\\$&")))).toBeInTheDocument();
    expect(screen.queryByText(notes.sizeGuide)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Size and fit/ }));
    expect(screen.getByText(notes.sizeGuide)).toBeInTheDocument();
  });

  it("shows the delivery note in its own section", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /Delivery and returns/ }));
    expect(screen.getByText(notes.delivery)).toBeInTheDocument();
  });

  it("names the product and fleece in the details body", () => {
    setup();
    const body = screen.getByText(new RegExp(`${product.name} in ${product.fleece.toLowerCase()} fleece`));
    expect(body).toBeInTheDocument();
  });

  it("swaps the + and – affordance as a section opens and closes", async () => {
    const { user } = setup();
    const details = screen.getByRole("button", { name: /Details/ });
    expect(details).toHaveTextContent("–");
    await user.click(details);
    expect(screen.getByRole("button", { name: /Details/ })).toHaveTextContent("+");
  });
});
