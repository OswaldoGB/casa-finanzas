import { describe, expect, it } from "vitest";
import { paymentPreview } from "./card-payment-preview";

describe("paymentPreview", () => {
  it("explains which statements a proposed payment settles", () => {
    expect(
      paymentPreview(80, [
        { dueOn: "2026-10-12", unpaid: 50 },
        { dueOn: "2026-11-12", unpaid: 45 },
      ]),
    ).toBe("Este pago salda 1 corte y deja $15.00 pendientes del siguiente.");
  });
});
