import { expect, it } from "vitest";
import { reminderFilters } from "./filters";
it("bounds reminder queries and discards unsupported filters", () => {
  expect(
    reminderFilters.parse({ page: -1, view: "unknown", category: "not-uuid" }),
  ).toMatchObject({ page: 1, view: "agenda", category: "" });
  expect(
    reminderFilters.safeParse({ date: "2026-10-17", month: "2026-10" }).success,
  ).toBe(true);
});
it("rejects impossible calendar days and months", () => {
  expect(reminderFilters.safeParse({ date: "2026-02-30" }).success).toBe(false);
  expect(reminderFilters.safeParse({ month: "2026-22" }).success).toBe(false);
});
