import { describe, expect, it } from "vitest";
import { paymentPreview } from "./card-payment-preview";

describe("paymentPreview", () => {
  it("explains which statements a proposed payment settles", () => {
    expect(
      paymentPreview(80, [
        { closesOn: "2026-10-07", dueOn: "2026-10-12", unpaid: 50 },
        { closesOn: "2026-11-07", dueOn: "2026-11-12", unpaid: 45 },
      ]),
    ).toBe("Este pago salda 1 corte y deja $15.00 pendientes del siguiente.");
  });
  it("uses cut order regardless of variable due dates and ignores settled cuts", () => {
    expect(
      paymentPreview(40, [
        { closesOn: "2026-11-07", dueOn: "2026-11-09", unpaid: 50 },
        { closesOn: "2026-09-07", dueOn: "2026-09-30", unpaid: 0 },
        { closesOn: "2026-10-07", dueOn: "2026-11-10", unpaid: 40 },
      ]),
    ).toBe("Este pago salda 1 corte y deja $50.00 pendientes del siguiente.");
  });
  it("does not promise future quotas are paid with excess money", () => {
    expect(
      paymentPreview(50, [
        { closesOn: "2026-10-07", dueOn: "2026-10-30", unpaid: 40 },
      ]),
    ).toContain("$10.00");
    expect(paymentPreview(50, [])).toContain("sin aplicar a un corte");
    expect(
      paymentPreview(
        50,
        [{ closesOn: "2026-11-07", dueOn: "2026-11-30", unpaid: 40 }],
        "2026-10-09",
      ),
    ).toContain("sin aplicar a un corte");
  });
});
