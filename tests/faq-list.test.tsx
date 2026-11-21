import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import FaqList from "@/components/FaqList";
import { faqs, type Faq } from "@/lib/faq";

const sample: Faq[] = [
  { q: "First question?", a: "First answer." },
  { q: "Second question?", a: "Second answer." },
  { q: "Third question?", a: "Third answer." },
];

const toggle = (q: string) => screen.getByRole("button", { name: new RegExp(q.replace("?", "\\?")) });

describe("rendering", () => {
  it("renders a toggle for every question", () => {
    render(<FaqList items={sample} />);
    for (const f of sample) expect(toggle(f.q)).toBeInTheDocument();
  });

  it("opens the first question by default", () => {
    render(<FaqList items={sample} />);
    expect(toggle(sample[0].q)).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("First answer.")).toBeInTheDocument();
  });

  it("keeps the other answers out of the document", () => {
    render(<FaqList items={sample} />);
    expect(screen.queryByText("Second answer.")).not.toBeInTheDocument();
    expect(screen.queryByText("Third answer.")).not.toBeInTheDocument();
  });

  it("points each toggle at the answer it controls", () => {
    render(<FaqList items={sample} />);
    expect(toggle(sample[0].q)).toHaveAttribute("aria-controls", "faq-0");
    expect(screen.getByText("First answer.")).toHaveAttribute("id", "faq-0");
  });

  it("renders nothing to toggle for an empty list", () => {
    render(<FaqList items={[]} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("renders the project's real FAQ data", () => {
    render(<FaqList items={faqs} />);
    expect(screen.queryAllByRole("button")).toHaveLength(faqs.length);
  });
});

describe("toggling", () => {
  it("closes the open question when clicked again", async () => {
    const user = userEvent.setup();
    render(<FaqList items={sample} />);
    await user.click(toggle(sample[0].q));
    expect(toggle(sample[0].q)).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("First answer.")).not.toBeInTheDocument();
  });

  it("opens another question and closes the previous one", async () => {
    const user = userEvent.setup();
    render(<FaqList items={sample} />);
    await user.click(toggle(sample[1].q));
    expect(screen.getByText("Second answer.")).toBeInTheDocument();
    expect(screen.queryByText("First answer.")).not.toBeInTheDocument();
  });

  it("never has two answers open at once", async () => {
    const user = userEvent.setup();
    render(<FaqList items={sample} />);
    const openCount = () =>
      sample.filter((x) => toggle(x.q).getAttribute("aria-expanded") === "true").length;

    // Clicking each in turn: the first click closes the default-open item, so
    // the count legitimately drops to 0. The invariant is "at most one".
    expect(openCount()).toBe(1);
    for (const f of sample) {
      await user.click(toggle(f.q));
      expect(openCount()).toBeLessThanOrEqual(1);
    }
  });

  it("opens exactly the question that was clicked while another is open", async () => {
    const user = userEvent.setup();
    render(<FaqList items={sample} />);
    await user.click(toggle(sample[2].q));
    const expanded = sample.filter(
      (x) => toggle(x.q).getAttribute("aria-expanded") === "true",
    );
    expect(expanded).toEqual([sample[2]]);
  });

  it("swaps + and – as a question opens and closes", async () => {
    const user = userEvent.setup();
    render(<FaqList items={sample} />);
    expect(toggle(sample[0].q)).toHaveTextContent("–");
    await user.click(toggle(sample[0].q));
    expect(toggle(sample[0].q)).toHaveTextContent("+");
  });

  it("can be driven from the keyboard", async () => {
    const user = userEvent.setup();
    render(<FaqList items={sample} />);
    await user.tab();
    expect(toggle(sample[0].q)).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(toggle(sample[0].q)).toHaveAttribute("aria-expanded", "false");
  });
});
