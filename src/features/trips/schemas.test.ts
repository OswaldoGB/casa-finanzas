import { expect, it } from "vitest";
import { tripSchema, activitySchema } from "./schemas";
it("requires a complete travel range and nonnegative money", () => {
  const data = {
    name: "Playa",
    budget: "600",
    start_date: "2026-10-27",
    end_date: "2026-10-30",
    status: "planned",
    destination: "Costa del Sol",
    participants: "Nosotros",
    description: "",
  };
  expect(tripSchema.parse(data).budget).toBe(600);
  expect(
    tripSchema.safeParse({ ...data, end_date: "2026-10-26" }).success,
  ).toBe(false);
  expect(tripSchema.safeParse({ ...data, budget: "-1" }).success).toBe(false);
});
it("supports free activities without requiring a price", () => {
  expect(
    activitySchema.parse({
      date: "2026-10-28",
      kind: "outing",
      time: "",
      title: "Caminar por la playa",
      location: "",
      notes: "",
    }),
  ).toMatchObject({ title: "Caminar por la playa", time: null });
});
