"use client";

import { useState } from "react";

/**
 * Newsletter sign-up. TODO before launch: send the email to your mailing
 * list provider (Klaviyo, Mailchimp, and so on) inside `onSubmit`.
 */
export default function Newsletter() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-3.5">
        <span className="display text-[34px] leading-[1.1] text-bone">Thank you.</span>
        <p className="m-0 text-[15px] leading-[1.7] text-dark-soft">You are on the list.</p>
        <button type="button" className="btn-bone" onClick={() => setSent(false)}>Add another email</button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="flex flex-wrap gap-3"
    >
      <label htmlFor="nl-email" className="sr-only">Email</label>
      <input id="nl-email" className="field-dark flex-[1_1_220px]" type="email" required placeholder="Your email" autoComplete="email" />
      <button type="submit" className="btn-bone">Subscribe</button>
    </form>
  );
}
