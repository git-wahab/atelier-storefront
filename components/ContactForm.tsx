"use client";

import { useState } from "react";

/** Posts to /api/contact. See app/api/contact/route.ts to connect an inbox. */
export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-start gap-4">
        <span className="display text-[44px] leading-[1.05]">Thank you.</span>
        <p className="copy">Your message is on its way. We will reply to the email you gave.</p>
        <button type="button" className="btn-out" onClick={() => setStatus("idle")}>Write another</button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
        <label className="flex flex-col gap-2"><span className="cap">Name</span><input name="name" className="field" required autoComplete="name" /></label>
        <label className="flex flex-col gap-2"><span className="cap">Email</span><input name="email" className="field" type="email" required autoComplete="email" /></label>
      </div>
      <label className="flex flex-col gap-2"><span className="cap">Subject</span><input name="topic" className="field" required placeholder="Sizing, an order, something else" /></label>
      <label className="flex flex-col gap-2"><span className="cap">Order number (optional)</span><input name="order" className="field" /></label>
      <label className="flex flex-col gap-2"><span className="cap">Message</span><textarea name="message" className="field min-h-[150px] resize-y leading-[1.6]" required /></label>
      <div className="flex flex-wrap items-center gap-5">
        <button type="submit" className="btn-ink" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send message"}
        </button>
        {status === "error" && <span role="alert" className="cap text-bronze">Could not send. Please try again.</span>}
      </div>
    </form>
  );
}
