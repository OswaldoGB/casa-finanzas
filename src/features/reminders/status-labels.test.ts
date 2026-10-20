import { describe, expect, it } from "vitest";
import { agendaBucket, dueLabel } from "./status";

describe("dueLabel", () => {
  it("habla en días relativos, también entre meses", () => {
    expect(dueLabel("2026-10-20", "2026-10-20")).toBe("Vence hoy");
    expect(dueLabel("2026-10-21", "2026-10-20")).toBe("Mañana");
    expect(dueLabel("2026-11-02", "2026-10-30")).toBe("En 3 días");
    expect(dueLabel("2026-10-19", "2026-10-20")).toBe("Venció ayer");
    expect(dueLabel("2026-10-18", "2026-10-20")).toBe("Venció hace 2 días");
    expect(dueLabel(null, "2026-10-20")).toBeNull();
  });
});

describe("agendaBucket", () => {
  it("agrupa por cercanía", () => {
    expect(agendaBucket("overdue", "2026-10-01", "2026-10-20")).toBe("overdue");
    expect(agendaBucket("today", "2026-10-20", "2026-10-20")).toBe("today");
    expect(agendaBucket("upcoming", "2026-10-27", "2026-10-20")).toBe("week");
    expect(agendaBucket("upcoming", "2026-10-28", "2026-10-20")).toBe("later");
    expect(agendaBucket("note", null, "2026-10-20")).toBe("undated");
    expect(agendaBucket("mileage_unknown", null, "2026-10-20")).toBe("undated");
  });
});
