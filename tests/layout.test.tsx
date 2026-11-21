import { describe, expect, it } from "vitest";
import RootLayout, { metadata } from "@/app/layout";

describe("root metadata", () => {
  it("sets a default title and description for every page", () => {
    expect(metadata.title).toBe("Embroidered Hoodies");
    expect(String(metadata.description)).toMatch(/shoulder to cuff/);
  });
});

describe("root layout", () => {
  // Rendering <html>/<body> into jsdom's existing document is not meaningful,
  // so the returned element tree is inspected directly.
  const tree = RootLayout({ children: <p>page content</p> }) as React.ReactElement<{
    lang: string;
    children: React.ReactNode;
  }>;

  it("declares the document language for screen readers", () => {
    expect(tree.type).toBe("html");
    expect(tree.props.lang).toBe("en");
  });

  it("wraps the page in the cart provider, header, main and footer", () => {
    const json = JSON.stringify(tree, (_k, v) =>
      typeof v === "function" ? (v.name || "anonymous") : v,
    );
    for (const name of ["CartProvider", "SiteHeader", "SiteFooter", "main"]) {
      expect(json, name).toContain(name);
    }
  });

  it("keeps a #top anchor for the back-to-top link", () => {
    expect(JSON.stringify(tree)).toContain('"id":"top"');
  });

  it("passes the page through as children", () => {
    expect(JSON.stringify(tree)).toContain("page content");
  });
});
