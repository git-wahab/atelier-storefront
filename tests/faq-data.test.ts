import { describe, expect, it } from "vitest";
import { faqs } from "@/lib/faq";

describe("FAQ data", () => {
  it("is not empty", () => {
    expect(faqs.length).toBeGreaterThan(0);
  });

  it("gives every entry a question and an answer", () => {
    for (const f of faqs) {
      expect(f.q.trim().length).toBeGreaterThan(0);
      expect(f.a.trim().length).toBeGreaterThan(0);
    }
  });

  it("phrases every question as a question", () => {
    for (const f of faqs) expect(f.q.trim().endsWith("?"), f.q).toBe(true);
  });

  it("keeps questions unique, since the question is the React key", () => {
    const questions = faqs.map((f) => f.q);
    expect(new Set(questions).size).toBe(questions.length);
  });
});
