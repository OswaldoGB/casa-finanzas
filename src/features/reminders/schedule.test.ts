import { expect, it } from "vitest";
import { nextOccurrence } from "./schedule";
import { reminderStatus } from "./status";
const schedule = {
  dueDate: "2026-01-31",
  dueTime: null,
  anchorDate: "2026-01-31",
  repeatUnit: "month" as const,
  repeatInterval: 1,
  repeatFrom: "calendar" as const,
  dueKm: null,
  currentKm: null,
  repeatKm: null,
  snoozedUntil: null,
  status: "active" as const,
};
it("keeps calendar anchors through short months and leap years", () => {
  const feb = nextOccurrence(schedule, {
    performedDate: "2026-01-31",
    performedKm: null,
    today: "2026-01-31",
  });
  expect(feb.dueDate).toBe("2026-02-28");
  expect(
    nextOccurrence(
      { ...schedule, dueDate: feb.dueDate },
      { performedDate: "2026-02-28", performedKm: null, today: "2026-02-28" },
    ).dueDate,
  ).toBe("2026-03-31");
  expect(
    nextOccurrence(
      {
        ...schedule,
        dueDate: "2028-02-29",
        anchorDate: "2028-02-29",
        repeatUnit: "year",
      },
      { performedDate: "2028-02-29", performedKm: null, today: "2028-02-29" },
    ).dueDate,
  ).toBe("2029-02-28");
});
it("skips missed fixed periods but preserves an old completion-based next date", () => {
  expect(
    nextOccurrence(
      {
        ...schedule,
        dueDate: "2026-10-01",
        anchorDate: "2026-10-01",
        repeatUnit: "week",
      },
      { performedDate: "2026-10-01", performedKm: null, today: "2026-10-17" },
    ),
  ).toMatchObject({ dueDate: "2026-10-22", skippedCount: 2 });
  expect(
    nextOccurrence(
      { ...schedule, repeatFrom: "completion" },
      { performedDate: "2026-01-10", performedKm: null, today: "2026-10-17" },
    ).dueDate,
  ).toBe("2026-02-10");
});
it("advances mileage from actual performance and treats either threshold as due", () => {
  expect(
    nextOccurrence(
      {
        ...schedule,
        dueDate: null,
        repeatUnit: null,
        dueKm: 120000,
        repeatKm: 5000,
      },
      { performedDate: "2026-10-16", performedKm: 120000, today: "2026-10-17" },
    ).dueKm,
  ).toBe(125000);
  expect(
    reminderStatus(
      {
        ...schedule,
        kind: "once",
        dueDate: "2026-12-01",
        dueKm: 125000,
        currentKm: 125000,
      },
      "2026-10-17",
    ),
  ).toBe("overdue");
  expect(
    reminderStatus(
      {
        ...schedule,
        kind: "once",
        dueDate: null,
        dueKm: 125000,
        currentKm: null,
      },
      "2026-10-17",
    ),
  ).toBe("mileage_unknown");
  expect(
    reminderStatus({ ...schedule, kind: "note", dueDate: null }, "2026-10-17"),
  ).toBe("note");
});
