import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SiteFooter from "@/components/SiteFooter";
import { brandName, contact } from "@/lib/config";
import { products } from "@/lib/products";

describe("SiteFooter", () => {
  it("renders inside a contentinfo landmark", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("links to every product", () => {
    render(<SiteFooter />);
    for (const p of products) {
      expect(screen.getByRole("link", { name: p.name })).toHaveAttribute(
        "href",
        `/products/${p.slug}`,
      );
    }
  });

  it("links to the help page and the contact anchor", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/help");
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/help#contact");
  });

  it("shows the contact details from config", () => {
    render(<SiteFooter />);
    expect(screen.getByText(contact.email)).toBeInTheDocument();
    expect(screen.getByText(contact.instagram)).toBeInTheDocument();
    expect(screen.getByText(contact.otherSocial)).toBeInTheDocument();
  });

  it("shows the brand name and the current year in the copyright line", () => {
    render(<SiteFooter />);
    const year = new Date().getFullYear();
    expect(
      screen.getByText(`© ${year} ${brandName}. All rights reserved.`),
    ).toBeInTheDocument();
  });

  it("leaves the legal links as placeholders", () => {
    render(<SiteFooter />);
    expect(screen.getByText("[PRIVACY] · [TERMS]")).toBeInTheDocument();
  });

  it("uses the bone wordmark against the ink band", () => {
    render(<SiteFooter />);
    expect(screen.getByAltText(brandName).getAttribute("src")).toContain("logo-wordmark-bone");
  });

  it("groups the links under Shop, Help and Follow", () => {
    render(<SiteFooter />);
    for (const label of ["Shop", "Help", "Follow"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
