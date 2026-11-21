export type Img = { src: string; alt: string; position?: string };

export type Figure = Img & {
  caption: string;
  note: string;
  ratio: "3/4" | "1/1";
  /** Artwork on a white ground is shown on a light panel instead of a dark plate. */
  plain?: boolean;
};

export type Product = {
  slug: string;
  name: string;
  /** Name with the last word set apart, for the italic accent in headings. */
  nameLead: string;
  nameTail: string;
  number: string;
  fleece: string;
  /** Thread colour shown as a small dot. */
  dot: string;
  threads: string;
  short: string;
  description: string;
  motif: string;
  motifNote: string;
  artHeading: [string, string];
  story: string;
  closeHeading: [string, string];
  hoodie: Img;
  pair: string;
  gallery: Img[];
  figures: Figure[];
};

export const products: Product[] = [
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
    hoodie: { src: "/images/crane-hoodie.jpg", alt: "Whispering Crane Bird hoodie in ivory with embroidered sleeves" },
    pair: "/images/crane-pair.webp",
    gallery: [
      { src: "/images/crane-hoodie.jpg", alt: "The hoodie, front" },
      { src: "/images/crane-sleeve-left.jpg", alt: "Left sleeve embroidery" },
      { src: "/images/crane-sleeve-right.jpg", alt: "Right sleeve embroidery" },
      { src: "/images/crane-detail.jpg", alt: "Blossom detail" },
      { src: "/images/crane-pair.webp", alt: "Artwork, both sleeves" },
    ],
    figures: [
      { src: "/images/crane-art-left.webp", alt: "Left sleeve artwork", caption: "1 · The artwork", note: "One sleeve, drawn flat.", ratio: "3/4", plain: true },
      { src: "/images/crane-sleeve-left.jpg", alt: "Left sleeve stitched", caption: "2 · On the sleeve", note: "The same scene in thread, from shoulder down.", ratio: "3/4" },
      { src: "/images/crane-detail.jpg", alt: "Blossom close-up", caption: "3 · Up close", note: "Blossom lifted off the fleece by dense stitching.", ratio: "1/1", position: "50% 50%" },
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
    hoodie: { src: "/images/bloom-hoodie.jpg", alt: "Midnight Bloom hoodie in charcoal with lavender embroidered sleeves" },
    pair: "/images/bloom-pair.webp",
    gallery: [
      { src: "/images/bloom-hoodie.jpg", alt: "The hoodie, front" },
      { src: "/images/bloom-sleeve-left.jpg", alt: "Left sleeve embroidery" },
      { src: "/images/bloom-sleeve-right.jpg", alt: "Right sleeve embroidery" },
      { src: "/images/bloom-detail.jpg", alt: "Lavender bud detail" },
      { src: "/images/bloom-pair.webp", alt: "Artwork, both sleeves" },
    ],
    figures: [
      { src: "/images/bloom-pair.webp", alt: "Artwork, both sleeves", caption: "1 · The artwork", note: "Both sleeves, drawn flat.", ratio: "3/4", plain: true },
      { src: "/images/bloom-sleeve-right.jpg", alt: "Sleeve stitched", caption: "2 · On the sleeve", note: "The same sprigs in thread, from cuff to shoulder.", ratio: "3/4", position: "50% 20%" },
      { src: "/images/bloom-detail.jpg", alt: "Lavender bud close-up", caption: "3 · Up close", note: "Buds raised off the charcoal fleece.", ratio: "1/1", position: "50% 50%" },
    ],
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function otherProduct(slug: string): Product {
  return products.find((p) => p.slug !== slug) ?? products[0];
}
