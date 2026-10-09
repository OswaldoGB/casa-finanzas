import { describe, expect, it } from "vitest";
import { accountSchema } from "./schemas";

const valid = {
  name: "Cuenta principal",
  type: "checking",
  opening_balance: "125.50",
  color: "#2563eb",
  icon: "wallet",
  credit_limit: "",
  statement_closing_day: "",
  payment_due_day: "",
};

describe("accountSchema", () => {
  it.each(["cash", "checking", "savings", "investment", "other"])(
    "accepts %s without hidden credit fields",
    (type) => {
      const {
        credit_limit,
        statement_closing_day,
        payment_due_day,
        ...visible
      } = valid;
      void credit_limit;
      void statement_closing_day;
      void payment_due_day;
      expect(accountSchema.parse({ ...visible, type })).toMatchObject({
        credit_limit: null,
        statement_closing_day: null,
        payment_due_day: null,
        card_network: null,
        card_product: null,
        card_last_four: null,
      });
      expect(
        accountSchema.safeParse({ ...visible, type: "credit_card" }).success,
      ).toBe(false);
    },
  );
  it("accepts a regular account and clears card-only fields", () => {
    expect(accountSchema.parse(valid)).toMatchObject({
      opening_balance: 125.5,
      credit_limit: null,
      statement_closing_day: null,
      payment_due_day: null,
    });
  });

  it("requires valid card terms and a positive limit", () => {
    expect(
      accountSchema.safeParse({ ...valid, type: "credit_card" }).success,
    ).toBe(false);
    expect(
      accountSchema.safeParse({
        ...valid,
        type: "credit_card",
        credit_limit: "1000",
        statement_closing_day: "31",
        payment_due_day: "15",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid money precision and unsafe formatting", () => {
    expect(
      accountSchema.safeParse({ ...valid, opening_balance: "12.345" }).success,
    ).toBe(false);
    expect(accountSchema.safeParse({ ...valid, color: "red" }).success).toBe(
      false,
    );
    expect(accountSchema.safeParse({ ...valid, name: "   " }).success).toBe(
      false,
    );
  });
});
