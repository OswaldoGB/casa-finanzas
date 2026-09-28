import { describe, expect, it } from "vitest";
import { reportDateRange } from "./schemas";

describe("reportDateRange", () => {
  it("defaults to the household's current month", () => {
    expect(reportDateRange("2026-09-27")).toEqual({
      from: "2026-09-01",
      to: "2026-09-27",
    });
  });
  it("ignores invalid dates and normalizes a reversed range", () => {
    expect(reportDateRange("2026-09-27", "2026-02-30", "not-a-date")).toEqual({
      from: "2026-09-01",
      to: "2026-09-27",
    });
    expect(reportDateRange("2026-09-27", "2026-10-01", "2026-08-01")).toEqual({
      from: "2026-08-01",
      to: "2026-10-01",
    });
  });
});
