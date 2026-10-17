import { expect, it } from "vitest";
import { reminderSchema } from "./schemas";
const input = {
  title: "Aceite",
  notes: "",
  reference: "Pickup",
  kind: "recurring",
  visibility: "personal",
  due_date: "2026-11-17",
  repeat_unit: "month",
  repeat_interval: "1",
  repeat_from: "completion",
  alert_days: [7, 1, 0],
};
it("accepts the category selector's explicit empty option", () => {
  expect(
    reminderSchema.parse({ ...input, category_id: "none" }).category_id,
  ).toBeNull();
});
it("normalizes alerts and enforces text and mileage limits", () => {
  expect(
    reminderSchema.parse({ ...input, alert_days: [7, 7, 0] }).alert_days,
  ).toEqual([7, 0]);
  for (const change of [
    { title: "a".repeat(121) },
    { notes: "a".repeat(5001) },
    { alert_days: [366] },
    { current_km: "1.11" },
  ])
    expect(reminderSchema.safeParse({ ...input, ...change }).success).toBe(
      false,
    );
});
it("requires real schedules and clears hidden note fields", () => {
  expect(
    reminderSchema.safeParse({ ...input, repeat_unit: "", repeat_km: "" })
      .success,
  ).toBe(false);
  expect(
    reminderSchema.safeParse({
      ...input,
      kind: "once",
      due_date: "",
      due_km: "",
    }).success,
  ).toBe(false);
  expect(reminderSchema.parse({ ...input, kind: "note" })).toMatchObject({
    due_date: null,
    repeat_unit: null,
    alert_days: [],
  });
  expect(
    reminderSchema.safeParse({ ...input, due_date: "2026-02-30" }).success,
  ).toBe(false);
});
