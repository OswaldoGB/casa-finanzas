import { describe, expect, it } from "vitest";
import { nextRecurringDate } from "./recurrence";

describe("nextRecurringDate", () => {
  it("advances weekly and biweekly dates by the requested interval", () => {
    expect(nextRecurringDate("2026-09-27", "2026-09-27", "weekly", 2)).toBe(
      "2026-10-11",
    );
    expect(nextRecurringDate("2026-09-27", "2026-09-27", "biweekly", 2)).toBe(
      "2026-10-25",
    );
  });

  it("clamps a month-end date, then restores the original day", () => {
    expect(nextRecurringDate("2027-01-31", "2027-01-31", "monthly", 1)).toBe(
      "2027-02-28",
    );
    expect(nextRecurringDate("2027-02-28", "2027-01-31", "monthly", 1)).toBe(
      "2027-03-31",
    );
  });

  it("preserves the leap-day anchor for yearly recurrences", () => {
    expect(nextRecurringDate("2024-02-29", "2024-02-29", "yearly", 1)).toBe(
      "2025-02-28",
    );
    expect(nextRecurringDate("2027-02-28", "2024-02-29", "yearly", 1)).toBe(
      "2028-02-29",
    );
  });

  it("rejects invalid dates and nonpositive intervals", () => {
    expect(() =>
      nextRecurringDate("2026-02-30", "2026-01-30", "monthly", 1),
    ).toThrow(RangeError);
    expect(() =>
      nextRecurringDate("2026-01-01", "2026-01-01", "monthly", 0),
    ).toThrow(RangeError);
  });
});
