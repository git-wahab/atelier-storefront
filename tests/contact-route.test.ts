import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/contact/route";

function post(body: unknown, { raw = false } = {}) {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

const valid = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "Do you ship to the UK?",
};

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("POST /api/contact — malformed payloads", () => {
  it("rejects a body that is not JSON", async () => {
    const res = await POST(post("not json at all", { raw: true }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "Invalid request" });
  });

  it("rejects an empty body", async () => {
    const res = await POST(post("", { raw: true }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "Invalid request" });
  });

  it("rejects truncated JSON", async () => {
    const res = await POST(post('{"name":"Ada"', { raw: true }));
    expect(res.status).toBe(400);
  });

  it("rejects a body of literal null without throwing", async () => {
    const res = await POST(post("null", { raw: true }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "Invalid request" });
  });

  it("rejects a bare number or string body", async () => {
    for (const raw of ["123", '"hello"', "true"]) {
      const res = await POST(post(raw, { raw: true }));
      expect(res.status, raw).toBe(400);
    }
  });

  it("does not log anything when the body cannot be parsed", async () => {
    await POST(post("nope", { raw: true }));
    expect(console.log).not.toHaveBeenCalled();
  });
});

describe("POST /api/contact — validation", () => {
  it("requires a name", async () => {
    const res = await POST(post({ ...valid, name: "" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: "Missing fields" });
  });

  it("requires a message", async () => {
    const res = await POST(post({ ...valid, message: "" }));
    expect(res.status).toBe(400);
  });

  it("requires an email containing @", async () => {
    const res = await POST(post({ ...valid, email: "ada-at-example.com" }));
    expect(res.status).toBe(400);
  });

  it("treats whitespace-only fields as missing", async () => {
    for (const field of ["name", "email", "message"] as const) {
      const res = await POST(post({ ...valid, [field]: "   \n\t  " }));
      expect(res.status, field).toBe(400);
    }
  });

  it("treats absent fields as missing", async () => {
    for (const field of ["name", "email", "message"] as const) {
      const body: Record<string, unknown> = { ...valid };
      delete body[field];
      expect((await POST(post(body))).status, field).toBe(400);
    }
  });

  it("treats null fields as missing", async () => {
    for (const field of ["name", "email", "message"] as const) {
      const res = await POST(post({ ...valid, [field]: null }));
      expect(res.status, field).toBe(400);
    }
  });

  it("rejects an empty object", async () => {
    expect((await POST(post({}))).status).toBe(400);
  });

  it("rejects a JSON array", async () => {
    expect((await POST(post([]))).status).toBe(400);
  });

  it("does not log a rejected submission", async () => {
    await POST(post({}));
    expect(console.log).not.toHaveBeenCalled();
  });
});

describe("POST /api/contact — accepted submissions", () => {
  it("accepts a complete submission", async () => {
    const res = await POST(post(valid));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("answers with JSON", async () => {
    const res = await POST(post(valid));
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("trims the fields it logs", async () => {
    await POST(post({ name: "  Ada  ", email: "  ada@example.com  ", message: "  Hi  " }));
    expect(console.log).toHaveBeenCalledWith(
      "[contact]",
      expect.objectContaining({ name: "Ada", email: "ada@example.com", message: "Hi" }),
    );
  });

  it("passes the optional topic and order through untouched", async () => {
    await POST(post({ ...valid, topic: "Sizing", order: "A-1234" }));
    expect(console.log).toHaveBeenCalledWith(
      "[contact]",
      expect.objectContaining({ topic: "Sizing", order: "A-1234" }),
    );
  });

  it("logs topic and order as undefined when they are omitted", async () => {
    await POST(post(valid));
    expect(console.log).toHaveBeenCalledWith(
      "[contact]",
      expect.objectContaining({ topic: undefined, order: undefined }),
    );
  });

  it("logs exactly once per accepted submission", async () => {
    await POST(post(valid));
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it("accepts a long message", async () => {
    const res = await POST(post({ ...valid, message: "x".repeat(10_000) }));
    expect(res.status).toBe(200);
  });

  // Documents how weak the current check is, so tightening it is a visible
  // change rather than a silent one.
  it("accepts any address containing @, and coerces non-strings", async () => {
    expect((await POST(post({ ...valid, email: "@" }))).status).toBe(200);
    expect((await POST(post({ ...valid, name: 12345 }))).status).toBe(200);
    expect((await POST(post({ ...valid, name: ["Ada"] }))).status).toBe(200);
    expect((await POST(post({ ...valid, name: { first: "Ada" } }))).status).toBe(200);
  });
});
