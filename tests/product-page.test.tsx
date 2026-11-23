import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProductPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/products/[slug]/page";
import { notes } from "@/lib/config";
import { products } from "@/lib/products";
import { CartProvider } from "@/lib/cart";

const [crane, bloom] = products;

describe("generateStaticParams", () => {
  it("pre-renders a route for every product", () => {
    expect(generateStaticParams()).toEqual([
      { slug: crane.slug },
      { slug: bloom.slug },
    ]);
  });

  it("returns one entry per product, with no duplicates", () => {
    const params = generateStaticParams();
    expect(params).toHaveLength(products.length);
    expect(new Set(params.map((p) => p.slug)).size).toBe(products.length);
  });
});

describe("generateMetadata", () => {
  it("titles the page after the product and uses its short copy", () => {
    expect(generateMetadata({ params: { slug: crane.slug } })).toEqual({
      title: `${crane.name} · Embroidered Hoodies`,
      description: crane.short,
    });
  });

  it("does the same for the second product", () => {
    expect(generateMetadata({ params: { slug: bloom.slug } })).toEqual({
      title: `${bloom.name} · Embroidered Hoodies`,
      description: bloom.short,
    });
  });

  it("returns empty metadata for an unknown slug rather than throwing", () => {
    expect(generateMetadata({ params: { slug: "nope" } })).toEqual({});
  });
});

describe("rendering a product page", () => {
  // The page embeds ProductBuy, which reads the cart context.
  function renderPage(slug: string) {
    return render(<CartProvider>{ProductPage({ params: { slug } })}</CartProvider>);
  }

  it("shows the product name as the page heading", () => {
    renderPage(crane.slug);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(crane.name);
  });

  it("offers a breadcrumb trail back to the collection", () => {
    renderPage(crane.slug);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Collection" })).toHaveAttribute(
      "href",
      "/#collection",
    );
  });

  it("marks the current page in the breadcrumb", () => {
    renderPage(crane.slug);
    expect(screen.getByText(crane.name, { selector: '[aria-current="page"]' })).toBeInTheDocument();
  });

  it("tells the artwork story", () => {
    renderPage(crane.slug);
    expect(screen.getByText(crane.story)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: crane.artHeading.join(" ") }),
    ).toBeInTheDocument();
  });

  it("lists the specification as term and value pairs", () => {
    const { container } = renderPage(crane.slug);
    expect(screen.getByText("Specification")).toBeInTheDocument();

    // Read each value from its own <dd>: the thread colours also appear in the
    // buy panel above, so a document-wide query matches twice.
    const spec = new Map(
      Array.from(container.querySelectorAll("dt")).map((dt) => [
        dt.textContent,
        dt.nextElementSibling?.textContent,
      ]),
    );
    expect(spec.get("Fleece")).toBe(crane.fleece);
    expect(spec.get("Thread")).toBe(crane.threads);
    expect(spec.get("Embroidery")).toBe("Both sleeves, shoulder to cuff, mirrored");
    expect(spec.get("Fabric")).toBe(notes.fabric);
    expect(spec.get("Fit")).toBe(notes.fit);
    expect(spec.get("Care")).toBe(notes.care);
  });

  it("shows every close-up figure with its caption and note", () => {
    renderPage(crane.slug);
    for (const f of crane.figures) {
      // Both are nullable in the API; every figure in this fixture sets them.
      expect(screen.getByText(f.caption ?? "")).toBeInTheDocument();
      expect(screen.getByText(f.note ?? "")).toBeInTheDocument();
    }
  });

  it("cross-sells the other design", () => {
    renderPage(crane.slug);
    expect(screen.getByText("The other design")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `View ${bloom.name}` })).toHaveAttribute(
      "href",
      `/products/${bloom.slug}`,
    );
    expect(screen.getByText(bloom.short)).toBeInTheDocument();
  });

  it("renders the second product's page too, cross-selling the first", () => {
    renderPage(bloom.slug);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(bloom.name);
    expect(screen.getByRole("link", { name: `View ${crane.name}` })).toHaveAttribute(
      "href",
      `/products/${crane.slug}`,
    );
  });

  it("calls notFound() for an unknown slug", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderPage("not-a-real-product")).toThrow();
  });
});
