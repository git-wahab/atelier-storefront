import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Photo from "@/components/Photo";
import Heading from "@/components/Heading";
import FactsStrip, { type Fact } from "@/components/FactsStrip";
import LogoMark from "@/components/LogoMark";
import { brandName } from "@/lib/config";

describe("Photo", () => {
  it("renders the image with its alt text", () => {
    render(<Photo src="/images/crane-hoodie.jpg" alt="A hoodie" />);
    expect(screen.getByAltText("A hoodie")).toBeInTheDocument();
  });

  it("puts the photograph on a dark plate by default", () => {
    const { container } = render(<Photo src="/images/crane-hoodie.jpg" alt="A hoodie" />);
    expect(container.querySelector(".frame")).toBeInTheDocument();
  });

  it("uses a 4/5 box unless told otherwise", () => {
    const { container } = render(<Photo src="/images/crane-hoodie.jpg" alt="A hoodie" />);
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe("4/5");
  });

  it("accepts a custom aspect ratio", () => {
    const { container } = render(<Photo src="/images/crane-hoodie.jpg" alt="A hoodie" ratio="1/1" />);
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe("1/1");
  });

  it("defaults the focal point to the upper middle", () => {
    render(<Photo src="/images/crane-hoodie.jpg" alt="A hoodie" />);
    expect(screen.getByAltText("A hoodie").style.objectPosition).toBe("50% 25%");
  });

  it("accepts a custom focal point", () => {
    render(<Photo src="/images/crane-hoodie.jpg" alt="A hoodie" position="50% 70%" />);
    expect(screen.getByAltText("A hoodie").style.objectPosition).toBe("50% 70%");
  });

  it("shows white-ground artwork on a light panel, uncropped", () => {
    const { container } = render(
      <Photo src="/images/crane-pair.webp" alt="Artwork" plain />,
    );
    expect(container.querySelector(".frame")).not.toBeInTheDocument();
    expect(container.querySelector(".bg-paper")).toBeInTheDocument();
    expect(screen.getByAltText("Artwork").className).toContain("object-contain");
  });

  it("keeps the custom ratio in plain mode", () => {
    const { container } = render(
      <Photo src="/images/crane-pair.webp" alt="Artwork" plain ratio="3/4" />,
    );
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe("3/4");
  });

  it("passes extra classes through to the box", () => {
    const { container } = render(
      <Photo src="/images/crane-hoodie.jpg" alt="A hoodie" className="plate-in" />,
    );
    expect(container.firstElementChild).toHaveClass("plate-in");
    expect(container.firstElementChild).toHaveClass("frame");
  });

  it("passes extra classes through in plain mode too", () => {
    const { container } = render(
      <Photo src="/images/crane-pair.webp" alt="Artwork" plain className="drift" />,
    );
    expect(container.firstElementChild).toHaveClass("drift");
  });
});

describe("Heading", () => {
  it("renders a level-two heading by default", () => {
    render(<Heading lead="The design" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("The design");
  });

  it("can render as a level-one heading", () => {
    render(<Heading lead="The design" as="h1" />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("sets the tail in an em so it picks up the bronze italic", () => {
    const { container } = render(<Heading lead="Two cranes," tail="mirrored." />);
    expect(container.querySelector("em")).toHaveTextContent("mirrored.");
  });

  it("joins lead and tail with a space", () => {
    render(<Heading lead="Two cranes," tail="mirrored." />);
    expect(screen.getByRole("heading")).toHaveTextContent("Two cranes, mirrored.");
  });

  it("omits the em when there is no tail", () => {
    const { container } = render(<Heading lead="Specification" />);
    expect(container.querySelector("em")).toBeNull();
  });

  it("shows the caption when one is given", () => {
    render(<Heading cap="The artwork" lead="Two cranes," />);
    expect(screen.getByText("The artwork")).toBeInTheDocument();
  });

  it("omits the caption when none is given", () => {
    const { container } = render(<Heading lead="Two cranes," />);
    expect(container.querySelector(".cap")).toBeNull();
  });

  it("uses the section scale by default and the side scale on request", () => {
    const { container: a } = render(<Heading lead="A" />);
    expect(a.querySelector("h2")).toHaveClass("h-section");
    const { container: b } = render(<Heading lead="B" size="side" />);
    expect(b.querySelector("h2")).toHaveClass("h-side");
  });

  it("passes extra classes through to the wrapper", () => {
    const { container } = render(<Heading lead="A" className="rise" />);
    expect(container.firstElementChild).toHaveClass("rise");
  });
});

describe("FactsStrip", () => {
  const facts: Fact[] = [
    { label: "Placement", value: "Both sleeves", note: "Shoulder to cuff." },
    { label: "Designs", value: "Two, mirrored", note: "Left and right reflect." },
    { label: "Surface", value: "Raised stitch", note: "Dense thread." },
  ];

  it("renders the label, value and note of every fact", () => {
    render(<FactsStrip facts={facts} />);
    for (const f of facts) {
      expect(screen.getByText(f.label)).toBeInTheDocument();
      expect(screen.getByText(f.value)).toBeInTheDocument();
      expect(screen.getByText(f.note)).toBeInTheDocument();
    }
  });

  it("renders one column per fact", () => {
    const { container } = render(<FactsStrip facts={facts} />);
    expect(container.firstElementChild!.children).toHaveLength(facts.length);
  });

  it("leaves the first column without a dividing rule", () => {
    const { container } = render(<FactsStrip facts={facts} />);
    const columns = Array.from(container.firstElementChild!.children);
    expect(columns[0]).not.toHaveClass("border-l");
    expect(columns[1]).toHaveClass("border-l");
    expect(columns[2]).toHaveClass("border-l");
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(<FactsStrip facts={[]} />);
    expect(container.firstElementChild!.children).toHaveLength(0);
  });
});

describe("LogoMark", () => {
  it("shows the wordmark, named for the brand", () => {
    render(<LogoMark />);
    expect(screen.getByAltText(brandName)).toBeInTheDocument();
  });

  it("uses the ink wordmark on light backgrounds by default", () => {
    render(<LogoMark />);
    expect(screen.getByAltText(brandName).getAttribute("src")).toContain("logo-wordmark-ink");
  });

  it("uses the bone wordmark when placed on the dark band", () => {
    render(<LogoMark tone="dark" />);
    expect(screen.getByAltText(brandName).getAttribute("src")).toContain("logo-wordmark-bone");
  });
});
