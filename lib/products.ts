/**
 * Product content, and the types the API will deliver it in.
 *
 * The types come from `lib/api-types.ts`, which mirrors `Storefont API.md`.
 * The array below is sample content shaped exactly like an API response, so it
 * doubles as the fixture the tests run against. When the API is wired up, the
 * array goes and the types stay.
 *
 * Note `price` here is in MINOR UNITS (12000 = $120.00), as the API sends it.
 * `lib/config.ts` still holds prices in whole currency units for `money()`;
 * reconciling those two is part of the API migration, not of this file.
 */
import type {
  Figure,
  Img,
  Product,
  ProductCard,
  Variant,
} from "./api-types";

export type { Figure, Img, Product, ProductCard, Variant };

/**
 * A product the storefront can actually put on a page.
 *
 * The API may send `hoodie: null` for a product whose main photograph has not
 * been uploaded. Such a product is skipped rather than rendered, so every
 * render site can reach `.hoodie.src` without a guard.
 */
export type RenderableProduct = Product & { hoodie: Img };

export function isRenderable(p: Product): p is RenderableProduct {
  return p.hoodie !== null;
}

const img = (
  src: string,
  alt: string,
  width: number | null = null,
  height: number | null = null,
): Img => ({ src, alt, width, height });

/** Fills in the two figure fields the API always sends but this copy rarely sets. */
const fig = (
  f: Omit<Figure, "plain" | "position"> &
    Partial<Pick<Figure, "plain" | "position">>,
): Figure => ({ plain: false, position: null, ...f });

/** The hand-written half. Commerce fields are derived below. */
type ProductContent = Omit<
  Product,
  "price" | "currency" | "isFeatured" | "inStock" | "sizes" | "variants" | "collections" | "related"
>;

const SIZES = ["XS", "S", "M", "L", "XL"];
const PRICE = 12000;

const content: ProductContent[] = [
  {
    slug: "whispering-crane-bird",
    name: "Whispering Crane Bird",
    nameLead: "Whispering Crane",
    nameTail: "Bird",
    number: "01",
    fleece: "Ivory",
    dot: "#C98763",
    threads: "Blue, silver, copper-rose",
    short: "Two cranes in flight among cherry blossom, embroidered in blue, silver and copper-rose on ivory fleece.",
    description:
      "Two cranes in flight among cherry blossom, embroidered the full length of both sleeves on soft ivory fleece. The body stays plain, so the sleeves carry the whole design.",
    motif: "Cranes and blossom",
    motifNote: "Two cranes, facing each other across the body.",
    artHeading: ["Two cranes,", "mirrored."],
    story:
      "A pair of cranes lifts through branches of cherry blossom, drawn in fine lines and filled with blue, silver and copper-rose thread. One half runs down each sleeve.",
    closeHeading: ["Every feather,", "in thread."],
    hoodie: img(
      "/images/crane-hoodie.jpg",
      "Whispering Crane Bird hoodie in ivory with embroidered sleeves",
      843,
      1264,
    ),
    pair: "/images/crane-pair.webp",
    gallery: [
      img("/images/crane-hoodie.jpg", "The hoodie, front"),
      img("/images/crane-sleeve-left.jpg", "Left sleeve embroidery"),
      img("/images/crane-sleeve-right.jpg", "Right sleeve embroidery"),
      img("/images/crane-detail.jpg", "Blossom detail"),
      img("/images/crane-pair.webp", "Artwork, both sleeves"),
    ],
    figures: [
      fig({ src: "/images/crane-art-left.webp", alt: "Left sleeve artwork", caption: "1 · The artwork", note: "One sleeve, drawn flat.", ratio: "3/4", plain: true }),
      fig({ src: "/images/crane-sleeve-left.jpg", alt: "Left sleeve stitched", caption: "2 · On the sleeve", note: "The same scene in thread, from shoulder down.", ratio: "3/4" }),
      fig({ src: "/images/crane-detail.jpg", alt: "Blossom close-up", caption: "3 · Up close", note: "Blossom lifted off the fleece by dense stitching.", ratio: "1/1", position: "50% 50%" }),
    ],
  },
  {
    slug: "midnight-bloom",
    name: "Midnight Bloom",
    nameLead: "Midnight",
    nameTail: "Bloom",
    number: "02",
    fleece: "Charcoal",
    dot: "#8E63B8",
    threads: "Violet, lilac, sage green",
    short: "Sprigs of lavender climb both sleeves in violet and green thread, set against deep charcoal fleece.",
    description:
      "Sprigs of lavender climb both sleeves in violet and green thread, set against deep charcoal fleece. The body stays plain, so the sleeves carry the whole design.",
    motif: "Lavender sprigs",
    motifNote: "Sprays that curve in toward the chest.",
    artHeading: ["Lavender,", "mirrored."],
    story:
      "Lavender sprigs rise from the cuff and curve toward the shoulder, drawn in violet and lilac with sage green stems. One half runs down each sleeve.",
    closeHeading: ["Every bud,", "in thread."],
    hoodie: img(
      "/images/bloom-hoodie.jpg",
      "Midnight Bloom hoodie in charcoal with lavender embroidered sleeves",
      912,
      1172,
    ),
    pair: "/images/bloom-pair.webp",
    gallery: [
      img("/images/bloom-hoodie.jpg", "The hoodie, front"),
      img("/images/bloom-sleeve-left.jpg", "Left sleeve embroidery"),
      img("/images/bloom-sleeve-right.jpg", "Right sleeve embroidery"),
      img("/images/bloom-detail.jpg", "Lavender bud detail"),
      img("/images/bloom-pair.webp", "Artwork, both sleeves"),
    ],
    figures: [
      fig({ src: "/images/bloom-pair.webp", alt: "Artwork, both sleeves", caption: "1 · The artwork", note: "Both sleeves, drawn flat.", ratio: "3/4", plain: true }),
      fig({ src: "/images/bloom-sleeve-right.jpg", alt: "Sleeve stitched", caption: "2 · On the sleeve", note: "The same sprigs in thread, from cuff to shoulder.", ratio: "3/4", position: "50% 20%" }),
      fig({ src: "/images/bloom-detail.jpg", alt: "Lavender bud close-up", caption: "3 · Up close", note: "Buds raised off the charcoal fleece.", ratio: "1/1", position: "50% 50%" }),
    ],
  },
];

const toCard = (p: Product): ProductCard => ({
  slug: p.slug,
  name: p.name,
  nameLead: p.nameLead,
  nameTail: p.nameTail,
  number: p.number,
  fleece: p.fleece,
  dot: p.dot,
  threads: p.threads,
  short: p.short,
  motif: p.motif,
  motifNote: p.motifNote,
  price: p.price,
  currency: p.currency,
  isFeatured: p.isFeatured,
  inStock: p.inStock,
  hoodie: p.hoodie,
});

const priced: Product[] = content.map((p) => ({
  ...p,
  price: PRICE,
  currency: "USD",
  isFeatured: true,
  inStock: true,
  sizes: SIZES,
  variants: SIZES.map<Variant>((size) => ({ size, inStock: true, price: PRICE })),
  collections: [],
  related: [],
}));

/** Related products are resolved the way the API resolves them: cards, already filled in. */
export const products: Product[] = priced.map((p) => ({
  ...p,
  related: priced.filter((o) => o.slug !== p.slug).map(toCard),
}));

/** Only the products a page can render. See `RenderableProduct`. */
export const renderable: RenderableProduct[] = products.filter(isRenderable);

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

/**
 * The other design, for the "more to see" block on a product page.
 *
 * Superseded by `related` on the API payload — once products come from the API,
 * read `product.related` instead and delete this.
 */
export function otherProduct(slug: string): RenderableProduct {
  return renderable.find((p) => p.slug !== slug) ?? renderable[0];
}
