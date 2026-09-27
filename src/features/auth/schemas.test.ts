import { describe, expect, it } from "vitest";
import { resetSchema, safeNext } from "./schemas";

describe("safeNext", () => {
  it("acepta rutas internas", () => expect(safeNext("/transactions?x=1")).toBe("/transactions?x=1"));
  it("rechaza URLs externas y protocol-relative", () => {
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });
});

describe("resetSchema", () => {
  it("exige que coincidan", () => {
    expect(resetSchema.safeParse({ password: "12345678", confirm: "12345679" }).success).toBe(false);
    expect(resetSchema.safeParse({ password: "12345678", confirm: "12345678" }).success).toBe(true);
  });
});
