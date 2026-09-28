import { describe, expect, it } from "vitest";
import { planOccurrence, todayInTimeZone } from "./processing";

const rule = {
  next_run_date: "2026-01-31",
  start_date: "2026-01-31",
  end_date: null,
  frequency: "monthly" as const,
  interval_count: 1,
  is_active: true,
  mode: "confirm" as const,
};

describe("recurring processing", () => {
  it("uses each household's calendar day, including across UTC midnight", () => {
    const instant = new Date("2026-02-01T02:00:00Z");
    expect(todayInTimeZone(instant, "America/El_Salvador")).toBe("2026-01-31");
    expect(todayInTimeZone(instant, "Asia/Tokyo")).toBe("2026-02-01");
  });

  it("leaves future dates alone and catches an overdue occurrence", () => {
    expect(planOccurrence(rule, "2026-01-30")).toBeNull();
    expect(planOccurrence(rule, "2026-03-15")).toEqual({
      date: "2026-01-31",
      status: "pending",
      nextRunDate: "2026-02-28",
      isActive: true,
    });
  });

  it("posts auto entries and stops after the last allowed date", () => {
    expect(
      planOccurrence(
        { ...rule, mode: "auto", end_date: "2026-01-31" },
        "2026-02-01",
      ),
    ).toEqual({
      date: "2026-01-31",
      status: "posted",
      nextRunDate: "2026-02-28",
      isActive: false,
    });
    expect(
      planOccurrence({ ...rule, end_date: "2026-01-30" }, "2026-02-01"),
    ).toBeNull();
  });
  it("plans every missed month while preserving the original month-end anchor", () => {
    let cursor = rule;
    const dates: string[] = [];
    for (
      let occurrence = planOccurrence(cursor, "2026-03-31");
      occurrence;
      occurrence = planOccurrence(cursor, "2026-03-31")
    ) {
      dates.push(occurrence.date);
      cursor = { ...cursor, next_run_date: occurrence.nextRunDate };
    }
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(cursor.next_run_date).toBe("2026-04-30");
    expect(planOccurrence(cursor, "2026-03-31")).toBeNull();
  });
});
