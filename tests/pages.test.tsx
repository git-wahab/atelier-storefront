import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Home from "@/app/page";
import CartPage, { metadata as cartMetadata } from "@/app/cart/page";
import HelpPage, { metadata as helpMetadata } from "@/app/help/page";
import { CartProvider } from "@/lib/cart";
import { contact, money, priceOf } from "@/lib/config";
import { faqs } from "@/lib/faq";
import { products } from "@/lib/products";

const [crane, bloom] = products;

beforeEach(() => window.localStorage.clear());

describe("homepage", () => {
  beforeEach(() => {
    render(<CartProvider>{Home()}</CartProvider>);
  });

  it("leads with the headline", () => {
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "The design is the garment.",
    );
  });

  it("offers the two hero calls to action", () => {
    expect(screen.getByRole("link", { name: "Shop the collection" })).toHaveAttribute(
      "href",
      "#collection",
    );
    expect(screen.getByRole("link", { name: "See the artwork" })).toHaveAttribute(
      "href",
      "#artwork",
    );
  });

  it("anchors every section the navigation points at", () => {
    for (const id of ["collection", "artwork", "craft", "questions"]) {
      expect(document.getElementById(id), id).not.toBeNull();
    }
  });

  it("introduces both designs by name", () => {
    for (const p of products) {
      expect(screen.getAllByText(p.name).length).toBeGreaterThan(0);
    }
  });

  it("states the placement facts", () => {
    expect(screen.getAllByText("Both sleeves").length).toBeGreaterThan(0);
    expect(screen.getByText("Two, mirrored")).toBeInTheDocument();
    expect(screen.getAllByText("Raised stitch").length).toBeGreaterThan(0);
  });

  it("lists what makes the craft distinctive", () => {
    for (const title of [
      "Sleeve to sleeve",
      "Raised relief",
      "A mirrored pair",
      "One plain body",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it("compares the two designs row by row", () => {
    const rows: [string, string, string][] = [
      ["Fleece", crane.fleece, bloom.fleece],
      ["Thread", crane.threads, bloom.threads],
      ["Price", money(priceOf(crane.slug)), money(priceOf(bloom.slug))],
    ];
    for (const [label, a, b] of rows) {
      const cell = screen.getByText(label);
      const row = cell.closest("tr") ?? cell.parentElement!;
      expect(within(row as HTMLElement).getAllByText(a).length, label).toBeGreaterThan(0);
      expect(within(row as HTMLElement).getAllByText(b).length, label).toBeGreaterThan(0);
    }
  });

  it("shows a short selection of the FAQ, not the whole list", () => {
    for (const f of faqs.slice(0, 4)) {
      expect(screen.getByRole("button", { name: new RegExp(f.question.replace("?", "\\?")) })).toBeInTheDocument();
    }
    const last = faqs[faqs.length - 1];
    expect(
      screen.queryByRole("button", { name: new RegExp(last.question.replace("?", "\\?")) }),
    ).not.toBeInTheDocument();
  });

  it("invites a newsletter sign-up", () => {
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeInTheDocument();
  });

  it("links through to each product page", () => {
    for (const p of products) {
      const links = screen
        .getAllByRole("link")
        .filter((l) => l.getAttribute("href") === `/products/${p.slug}`);
      expect(links.length, p.slug).toBeGreaterThan(0);
    }
  });
});

describe("cart page", () => {
  it("titles the tab", () => {
    expect(cartMetadata.title).toBe("Cart · Embroidered Hoodies");
  });

  it("leads with its own headline", () => {
    render(<CartProvider>{CartPage()}</CartProvider>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Almost yours.");
  });

  it("renders the cart itself", () => {
    render(<CartProvider>{CartPage()}</CartProvider>);
    expect(screen.getByRole("heading", { name: "Your cart is empty." })).toBeInTheDocument();
  });

  it("shows saved lines when there are some", () => {
    window.localStorage.setItem(
      "luxCart",
      JSON.stringify([{ slug: crane.slug, size: "M", qty: 1 }]),
    );
    render(<CartProvider>{CartPage()}</CartProvider>);
    expect(screen.getByRole("button", { name: "Place order" })).toBeInTheDocument();
  });
});

describe("help page", () => {
  beforeEach(() => {
    render(HelpPage());
  });

  it("titles the tab", () => {
    expect(helpMetadata.title).toBe("Help and Contact · Embroidered Hoodies");
  });

  it("leads with its own headline", () => {
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("How can we help?");
  });

  it("anchors the questions and contact sections for in-page links", () => {
    expect(document.getElementById("questions")).not.toBeNull();
    expect(document.getElementById("contact")).not.toBeNull();
  });

  it("shows the whole FAQ", () => {
    for (const f of faqs) {
      expect(
        screen.getByRole("button", { name: new RegExp(f.question.replace("?", "\\?")) }),
      ).toBeInTheDocument();
    }
  });

  it("publishes the contact details", () => {
    expect(screen.getByText(contact.email)).toBeInTheDocument();
    expect(screen.getByText(contact.instagram)).toBeInTheDocument();
    expect(screen.getByText(contact.hours)).toBeInTheDocument();
  });

  it("quotes the expected response time", () => {
    expect(
      screen.getByText(new RegExp(contact.responseTime.replace(/[[\]]/g, "\\$&"))),
    ).toBeInTheDocument();
  });

  it("offers the contact form", () => {
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });
});
