import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getProduct, otherProduct, products, type Product } from "@/lib/products";

// jsdom gives import.meta.url an http:// origin, so derive paths from the
// Vitest root (the project directory) instead.
const PUBLIC_DIR = resolve(process.cwd(), "public");

/** Every image src referenced anywhere on a product. */
function imagesOf(p: Product): { src: string; alt: string }[] {
  // `hoodie` and `pair` are both nullable in the API, so skip them when they
  // are absent rather than asserting: the pages already guard on them.
  const all = [
    p.hoodie,
    ...p.gallery,
    ...p.figures,
    p.pair === null ? null : { src: p.pair, alt: `${p.name} artwork` },
  ];
  return all.filter((i): i is { src: string; alt: string } => i !== null);
}

describe("catalogue shape", () => {
  it("ships the two designs the homepage and README describe", () => {
    expect(products).toHaveLength(2);
    expect(products.map((p) => p.slug)).toEqual(["whispering-crane-bird", "midnight-bloom"]);
  });

  it("has unique slugs, so routes and React keys do not collide", () => {
    expect(new Set(products.map((p) => p.slug)).size).toBe(products.length);
  });

  it("has unique design numbers", () => {
    expect(new Set(products.map((p) => p.number)).size).toBe(products.length);
  });

  it("uses URL-safe slugs", () => {
    for (const p of products) {
      expect(p.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(encodeURIComponent(p.slug)).toBe(p.slug);
    }
  });

  it("numbers each design as a zero-padded pair of digits", () => {
    for (const p of products) expect(p.number).toMatch(/^\d{2}$/);
  });

  it("gives every product the copy the pages read", () => {
    for (const p of products) {
      for (const key of [
        "name",
        "nameLead",
        "fleece",
        "threads",
        "short",
        "description",
        "motif",
        "motifNote",
        "story",
      ] as const) {
        expect(p[key].trim().length, `${p.slug}.${key}`).toBeGreaterThan(0);
      }
      // `nameTail` is nullable in the API: a one-part name simply loses the
      // italic accent. When it is set it still has to be real copy.
      if (p.nameTail !== null) {
        expect(p.nameTail.trim().length, `${p.slug}.nameTail`).toBeGreaterThan(0);
      }
    }
  });

  it("splits the name into lead and tail without losing a word", () => {
    for (const p of products) {
      const rejoined = p.nameTail === null ? p.nameLead : `${p.nameLead} ${p.nameTail}`;
      expect(rejoined).toBe(p.name);
    }
  });

  // The API sends one or two lines per heading; Heading drops the italic half
  // when the second line is missing, so both shapes render.
  it("gives each heading one or two parts, for the plain/italic pair", () => {
    for (const p of products) {
      expect([1, 2]).toContain(p.artHeading.length);
      expect([1, 2]).toContain(p.closeHeading.length);
      for (const part of [...p.artHeading, ...p.closeHeading]) {
        expect(part.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("uses a valid hex colour for the thread dot", () => {
    for (const p of products) expect(p.dot).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe("product imagery", () => {
  it("gives every product a gallery and a figure sequence", () => {
    for (const p of products) {
      expect(p.gallery.length).toBeGreaterThan(0);
      expect(p.figures.length).toBeGreaterThan(0);
    }
  });

  it("points every image at a file that exists in public/", () => {
    for (const p of products) {
      for (const img of imagesOf(p)) {
        expect(img.src.startsWith("/images/"), `${p.slug}: ${img.src}`).toBe(true);
        expect(existsSync(resolve(PUBLIC_DIR, `.${img.src}`)), `missing file: ${img.src}`).toBe(true);
      }
    }
  });

  it("gives every image non-empty alt text", () => {
    for (const p of products) {
      for (const img of imagesOf(p)) {
        expect(img.alt.trim().length, `${p.slug}: ${img.src}`).toBeGreaterThan(0);
      }
    }
  });

  it("uses only the aspect ratios the API defines", () => {
    for (const p of products) {
      // `null` is legal and means Photo falls back to its own 4/5 default.
      for (const f of p.figures) expect(["3/4", "1/1", "4/5", null]).toContain(f.ratio);
    }
  });

  // Both are nullable in the API; every figure in this fixture sets them, and
  // the product page only renders the ones that are there.
  it("gives every figure a caption and a note", () => {
    for (const p of products) {
      for (const f of p.figures) {
        expect(f.caption?.trim().length ?? 0, `${p.slug}: caption`).toBeGreaterThan(0);
        expect(f.note?.trim().length ?? 0, `${p.slug}: note`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps figure captions unique per product, since they are the React key", () => {
    for (const p of products) {
      const captions = p.figures.map((f) => f.caption);
      expect(new Set(captions).size, p.slug).toBe(captions.length);
    }
  });

  // Only figures carry a focal point: the API's plain image shape has no
  // `position` field, so gallery images all use ProductGallery's one default.
  it("uses a CSS position pair wherever a figure gives one", () => {
    for (const p of products) {
      for (const f of p.figures) {
        if (f.position !== null) expect(f.position).toMatch(/^\S+\s+\S+$/);
      }
    }
  });
});

describe("getProduct", () => {
  it("finds each product by slug", () => {
    for (const p of products) {
      expect(getProduct(p.slug)).toBe(p);
    }
  });

  it("returns undefined for an unknown slug, which the page turns into a 404", () => {
    expect(getProduct("not-a-product")).toBeUndefined();
  });

  it("returns undefined for an empty slug", () => {
    expect(getProduct("")).toBeUndefined();
  });

  it("is not fooled by inherited Object keys, because it searches the array", () => {
    expect(getProduct("constructor")).toBeUndefined();
    expect(getProduct("__proto__")).toBeUndefined();
  });

  it("matches exactly, not by prefix or case", () => {
    expect(getProduct("midnight")).toBeUndefined();
    expect(getProduct("Midnight-Bloom")).toBeUndefined();
    expect(getProduct(" midnight-bloom")).toBeUndefined();
  });
});

describe("otherProduct", () => {
  it("returns the opposite design for each slug", () => {
    expect(otherProduct("whispering-crane-bird").slug).toBe("midnight-bloom");
    expect(otherProduct("midnight-bloom").slug).toBe("whispering-crane-bird");
  });

  it("never returns the product you passed in", () => {
    for (const p of products) {
      expect(otherProduct(p.slug).slug).not.toBe(p.slug);
    }
  });

  it("always returns a real product, so the page can render unconditionally", () => {
    for (const slug of ["whispering-crane-bird", "midnight-bloom", "nonsense", ""]) {
      expect(products).toContain(otherProduct(slug));
    }
  });

  it("falls back to the first design for an unknown slug", () => {
    expect(otherProduct("nonsense")).toBe(products[0]);
  });

  // Pins the two-product assumption. With a third design added, "the other
  // design" would always be the first non-matching entry, so design 3 would
  // never be reachable from design 1. Update this test when that changes.
  it("only ever offers the first non-matching design", () => {
    expect(otherProduct(products[0].slug)).toBe(products[1]);
    expect(otherProduct(products[1].slug)).toBe(products[0]);
  });
});
