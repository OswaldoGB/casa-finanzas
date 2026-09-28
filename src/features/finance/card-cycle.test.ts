import { describe, expect, it } from "vitest";
import { cardStatementCycle } from "./card-cycle";

describe("cardStatementCycle", () => {
  it("returns the last closed cycle and its payment date", () => {
    expect(cardStatementCycle("2026-09-27", 15, 5)).toEqual({
      startsOn: "2026-08-16",
      closesOn: "2026-09-15",
      dueOn: "2026-10-05",
    });
  });

  it("uses the previous month when this month's closing date has not arrived", () => {
    expect(cardStatementCycle("2026-09-10", 15, 20)).toEqual({
      startsOn: "2026-07-16",
      closesOn: "2026-08-15",
      dueOn: "2026-08-20",
    });
  });

  it("clamps closing and payment days to short months", () => {
    expect(cardStatementCycle("2027-03-01", 31, 30)).toEqual({
      startsOn: "2027-02-01",
      closesOn: "2027-02-28",
      dueOn: "2027-03-30",
    });
  });
});
