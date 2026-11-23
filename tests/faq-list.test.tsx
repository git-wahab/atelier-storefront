import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import FaqList from "@/components/FaqList";
import { faqs, type Faq } from "@/lib/faq";

const sample: Faq[] = [
  { question: "First question?", answer: "First answer." },
  { question: "Second question?", answer: "Second answer." },
  { question: "Third question?", answer: "Third answer." },
];

const toggle = (question: string) =>
  screen.getByRole("button", { name: new RegExp(question.replace("?", "\\?")) });

describe("rendering", () => {
  it("renders a toggle for every question", () => {
    render(<FaqList items={sample} />);
    for (const f of sample) expect(toggle(f.question)).toBeInTheDocument();
  });

  it("opens the first question by default", () => {
    render(<FaqList items={sample} />);
    expect(toggle(sample[0].question)).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("First answer.")).toBeInTheDocument();
  });

  it("keeps the other answers out of the document", () => {
    render(<FaqList items={sample} />);
    expect(screen.queryByText("Second answer.")).not.toBeInTheDocument();
    expect(screen.queryByText("Third answer.")).not.toBeInTheDocument();
  });

  it("points each toggle at the answer it controls", () => {
    render(<FaqList items={sample} />);
    expect(toggle(sample[0].question)).toHaveAttribute("aria-controls", "faq-0");
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
    await user.click(toggle(sample[0].question));
    expect(toggle(sample[0].question)).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("First answer.")).not.toBeInTheDocument();
  });

  it("opens another question and closes the previous one", async () => {
    const user = userEvent.setup();
    render(<FaqList items={sample} />);
    await user.click(toggle(sample[1].question));
    expect(screen.getByText("Second answer.")).toBeInTheDocument();
    expect(screen.queryByText("First answer.")).not.toBeInTheDocument();
  });

  it("never has two answers open at once", async () => {
    const user = userEvent.setup();
    render(<FaqList items={sample} />);
    const openCount = () =>
      sample.filter((x) => toggle(x.question).getAttribute("aria-expanded") === "true").length;

    // Clicking each in turn: the first click closes the default-open item, so
    // the count legitimately drops to 0. The invariant is "at most one".
    expect(openCount()).toBe(1);
    for (const f of sample) {
      await user.click(toggle(f.question));
      expect(openCount()).toBeLessThanOrEqual(1);
    }
  });

  it("opens exactly the question that was clicked while another is open", async () => {
    const user = userEvent.setup();
    render(<FaqList items={sample} />);
    await user.click(toggle(sample[2].question));
    const expanded = sample.filter(
      (x) => toggle(x.question).getAttribute("aria-expanded") === "true",
    );
    expect(expanded).toEqual([sample[2]]);
  });

  it("swaps + and – as a question opens and closes", async () => {
    const user = userEvent.setup();
    render(<FaqList items={sample} />);
    expect(toggle(sample[0].question)).toHaveTextContent("–");
    await user.click(toggle(sample[0].question));
    expect(toggle(sample[0].question)).toHaveTextContent("+");
  });

  it("can be driven from the keyboard", async () => {
    const user = userEvent.setup();
    render(<FaqList items={sample} />);
    await user.tab();
    expect(toggle(sample[0].question)).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(toggle(sample[0].question)).toHaveAttribute("aria-expanded", "false");
  });
});
