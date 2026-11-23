import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Newsletter from "@/components/Newsletter";

describe("sign-up form", () => {
  it("offers a labelled email field", () => {
    render(<Newsletter />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toBeRequired();
  });

  it("associates the visually hidden label with the input", () => {
    const { container } = render(<Newsletter />);
    const label = container.querySelector("label");
    expect(label).toHaveAttribute("for", "nl-email");
    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "nl-email");
  });

  it("prompts with a placeholder and offers autofill", () => {
    render(<Newsletter />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("placeholder", "Your email");
    expect(input).toHaveAttribute("autocomplete", "email");
  });

  it("offers a subscribe button", () => {
    render(<Newsletter />);
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeInTheDocument();
  });
});

describe("after subscribing", () => {
  it("replaces the form with a confirmation", async () => {
    const user = userEvent.setup();
    render(<Newsletter />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Subscribe" }));

    expect(screen.getByText("Thank you.")).toBeInTheDocument();
    expect(screen.getByText("You are on the list.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("lets a second address be added", async () => {
    const user = userEvent.setup();
    render(<Newsletter />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Subscribe" }));
    await user.click(screen.getByRole("button", { name: "Add another email" }));

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("");
  });

  it("does not navigate away when submitting", async () => {
    const user = userEvent.setup();
    render(<Newsletter />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com{Enter}");
    expect(screen.getByText("Thank you.")).toBeInTheDocument();
  });
});
