import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContactForm from "@/components/ContactForm";

const fetchMock = vi.fn();

function ok() {
  fetchMock.mockResolvedValue({ ok: true } as Response);
}
function failStatus() {
  fetchMock.mockResolvedValue({ ok: false } as Response);
}
function failNetwork() {
  fetchMock.mockRejectedValue(new Error("offline"));
}

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Name"), "Ada");
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Subject"), "Sizing");
  await user.type(screen.getByLabelText("Order number (optional)"), "A-1");
  await user.type(screen.getByLabelText("Message"), "Which size?");
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  ok();
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("form fields", () => {
  it("renders every field the API reads", () => {
    render(<ContactForm />);
    for (const label of ["Name", "Email", "Subject", "Order number (optional)", "Message"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("marks everything but the order number as required", () => {
    render(<ContactForm />);
    for (const label of ["Name", "Email", "Subject", "Message"]) {
      expect(screen.getByLabelText(label), label).toBeRequired();
    }
    expect(screen.getByLabelText("Order number (optional)")).not.toBeRequired();
  });

  it("uses an email input so the browser validates the address", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
  });

  it("offers autofill for name and email", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText("Name")).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
  });

  it("uses a textarea for the message", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText("Message").tagName).toBe("TEXTAREA");
  });

  it("names the fields to match the API contract", () => {
    const { container } = render(<ContactForm />);
    for (const name of ["name", "email", "topic", "order", "message"]) {
      expect(container.querySelector(`[name="${name}"]`), name).not.toBeNull();
    }
  });

  it("starts with a ready submit button and no alert", () => {
    render(<ContactForm />);
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("submitting", () => {
  it("posts the typed values as JSON to /api/contact", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({
      name: "Ada",
      email: "ada@example.com",
      topic: "Sizing",
      order: "A-1",
      message: "Which size?",
    });
  });

  it("shows a thank-you in place of the form on success", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Thank you.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
  });

  it("lets the visitor write a second message", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await user.click(await screen.findByRole("button", { name: "Write another" }));

    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Message")).toHaveValue("");
  });

  it("submits only once per click", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});

describe("failure handling", () => {
  it("alerts the visitor when the API rejects the message", async () => {
    failStatus();
    const user = userEvent.setup();
    render(<ContactForm />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not send. Please try again.");
  });

  it("alerts the visitor when the network fails", async () => {
    failNetwork();
    const user = userEvent.setup();
    render(<ContactForm />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("keeps what the visitor typed after a failure", async () => {
    failStatus();
    const user = userEvent.setup();
    render(<ContactForm />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await screen.findByRole("alert");
    expect(screen.getByLabelText("Message")).toHaveValue("Which size?");
  });

  it("re-enables the button so the message can be retried", async () => {
    failStatus();
    const user = userEvent.setup();
    render(<ContactForm />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("in-flight state", () => {
  it("disables the button and says Sending while the request is open", async () => {
    let release!: (v: unknown) => void;
    fetchMock.mockImplementation(() => new Promise((r) => (release = r)));
    const user = userEvent.setup();
    render(<ContactForm />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Send message" }));

    const button = await screen.findByRole("button", { name: "Sending…" });
    expect(button).toBeDisabled();

    release({ ok: true });
    expect(await screen.findByText("Thank you.")).toBeInTheDocument();
  });
});
