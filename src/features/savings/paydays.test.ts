import { describe, expect, it } from "vitest";
import { currentPayday, nextPayday, provisionPlan } from "./paydays";

describe("días de pago", () => {
  it("quincenal: 15 y último día, incluido febrero", () => {
    expect(currentPayday("2026-10-29", "quincenal")).toBe("2026-10-15");
    expect(currentPayday("2026-10-31", "quincenal")).toBe("2026-10-31");
    expect(currentPayday("2026-03-05", "quincenal")).toBe("2026-02-28");
    expect(nextPayday("2026-02-15", "quincenal")).toBe("2026-02-28");
    expect(nextPayday("2028-02-20", "quincenal")).toBe("2028-02-29");
  });
  it("mensual: último día", () => {
    expect(currentPayday("2026-10-29", "mensual")).toBe("2026-09-30");
    expect(nextPayday("2026-12-31", "mensual")).toBe("2027-01-31");
  });
});

describe("provisionPlan", () => {
  const base = {
    target_amount: 30,
    balance: 0,
    target_date: "2026-12-31",
    cadence: "quincenal" as const,
    cycle_start: "2026-10-01",
    last_contribution_date: null,
  };
  it("reparte lo que falta entre los días de pago restantes y avisa", () => {
    // Desde el 15-oct hasta el 31-dic: 15/31 oct, 15/30 nov, 15/31 dic = 6
    expect(provisionPlan(base, "2026-10-20")).toMatchObject({ perPayday: 5, due: true, payday: "2026-10-15", remaining: 6 });
  });
  it("si ya apartaste en esta quincena, no avisa", () => {
    expect(provisionPlan({ ...base, last_contribution_date: "2026-10-16" }, "2026-10-20")?.due).toBe(false);
  });
  it("vencida: pide todo lo que falta; completa: no pide nada", () => {
    expect(provisionPlan({ ...base, balance: 10, target_date: "2026-10-10" }, "2026-10-20")).toMatchObject({ perPayday: 20 });
    expect(provisionPlan({ ...base, balance: 30 }, "2026-10-20")).toMatchObject({ perPayday: 0, due: false });
  });
  it("ciclo recién empezado: espera al siguiente día de pago", () => {
    expect(provisionPlan({ ...base, cycle_start: "2026-10-18" }, "2026-10-20")).toMatchObject({ due: false, remaining: 5 });
  });
  it("sin calendario: null", () => {
    expect(provisionPlan({ ...base, cadence: null }, "2026-10-20")).toBeNull();
  });
});
