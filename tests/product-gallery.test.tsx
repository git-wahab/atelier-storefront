import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ProductGallery from "@/components/ProductGallery";
import { products, type Img } from "@/lib/products";

const images: Img[] = [
  { src: "/images/crane-hoodie.jpg", alt: "The hoodie, front", width: 843, height: 1264 },
  { src: "/images/crane-sleeve-left.jpg", alt: "Left sleeve embroidery", width: 600, height: 1480 },
  { src: "/images/crane-detail.jpg", alt: "Blossom detail", width: null, height: null },
];

const thumb = (alt: string) => screen.getByRole("button", { name: alt });

describe("initial render", () => {
  it("shows the first image as the main one", () => {
    render(<ProductGallery images={images} />);
    expect(screen.getByAltText(images[0].alt)).toBeInTheDocument();
  });

  it("offers a thumbnail for every image, labelled by its alt text", () => {
    render(<ProductGallery images={images} />);
    expect(screen.getAllByRole("button")).toHaveLength(images.length);
    for (const im of images) expect(thumb(im.alt)).toBeInTheDocument();
  });

  it("marks the first thumbnail as the selected one", () => {
    render(<ProductGallery images={images} />);
    expect(thumb(images[0].alt)).toHaveAttribute("aria-pressed", "true");
    expect(thumb(images[1].alt)).toHaveAttribute("aria-pressed", "false");
  });

  it("hides the thumbnail images from screen readers, since the button is labelled", () => {
    render(<ProductGallery images={images} />);
    for (const im of images) {
      expect(thumb(im.alt).querySelector("img")).toHaveAttribute("alt", "");
    }
  });

  it("lays the thumbnail grid out in one column per image", () => {
    const { container } = render(<ProductGallery images={images} />);
    const grid = container.querySelector(".grid") as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe(`repeat(${images.length}, minmax(0, 1fr))`);
  });
});

describe("selecting a thumbnail", () => {
  it("swaps the main image", async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={images} />);
    await user.click(thumb(images[1].alt));
    expect(screen.getByAltText(images[1].alt)).toBeInTheDocument();
    expect(screen.queryByAltText(images[0].alt)).not.toBeInTheDocument();
  });

  it("moves the pressed state to the chosen thumbnail", async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={images} />);
    await user.click(thumb(images[2].alt));
    expect(thumb(images[2].alt)).toHaveAttribute("aria-pressed", "true");
    expect(thumb(images[0].alt)).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps exactly one thumbnail selected", async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={images} />);
    for (const im of images) {
      await user.click(thumb(im.alt));
      const pressed = screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("aria-pressed") === "true");
      expect(pressed).toHaveLength(1);
    }
  });

  it("can be reselected without changing anything", async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={images} />);
    await user.click(thumb(images[0].alt));
    expect(thumb(images[0].alt)).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByAltText(images[0].alt)).toBeInTheDocument();
  });

  // Gallery images carry no focal point: the API's image shape has no
  // `position` field — only figures do — so every gallery image uses the one
  // default. This pins that, so reintroducing a per-image override is a
  // deliberate change rather than an accident.
  it("uses the same focal point for the first image", () => {
    render(<ProductGallery images={images} />);
    expect(screen.getByAltText(images[0].alt).style.objectPosition).toBe("50% 25%");
  });

  it("uses that same focal point after swapping image", async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={images} />);
    await user.click(thumb(images[2].alt));
    expect(screen.getByAltText(images[2].alt).style.objectPosition).toBe("50% 25%");
  });
});

describe("with the project's real galleries", () => {
  it("renders each product's gallery", () => {
    for (const p of products) {
      const { unmount } = render(<ProductGallery images={p.gallery} />);
      expect(screen.getAllByRole("button")).toHaveLength(p.gallery.length);
      unmount();
    }
  });
});
