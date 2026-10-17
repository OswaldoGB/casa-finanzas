import { expect, it } from "vitest";
import { notificationCondition } from "./conditions";
const base = {
  status: "active",
  kind: "once",
  effective_date: "2026-10-24",
  due_km: null,
  current_km: null,
  alert_days: [7, 1, 0],
};
it("chooses only the nearest relevant alert and recovers missed daily runs", () => {
  expect(notificationCondition(base, "2026-10-16")).toBeNull();
  expect(notificationCondition(base, "2026-10-17")?.key).toBe("advance:7");
  expect(notificationCondition(base, "2026-10-20")?.key).toBe("advance:7");
  expect(notificationCondition(base, "2026-10-23")?.key).toBe("advance:1");
  expect(notificationCondition(base, "2026-10-24")?.key).toBe("due");
  expect(notificationCondition(base, "2026-11-24")?.key).toBe("overdue");
});
it("does not notify notes or paused items and handles mileage without a date", () => {
  expect(
    notificationCondition({ ...base, kind: "note" }, "2026-10-24"),
  ).toBeNull();
  expect(
    notificationCondition({ ...base, status: "paused" }, "2026-10-24"),
  ).toBeNull();
  expect(
    notificationCondition(
      { ...base, effective_date: null, due_km: 120000, current_km: 120000 },
      "2026-10-24",
    )?.key,
  ).toBe("mileage");
  expect(
    notificationCondition({ ...base, alert_days: [] }, "2026-10-24"),
  ).toBeNull();
});
