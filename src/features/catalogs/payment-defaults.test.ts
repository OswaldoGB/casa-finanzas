import { describe, expect, it } from "vitest";
import { methodForAccount } from "./payment-defaults";

const methods = [
  { id: "cash", type: "cash", account_id: null },
  { id: "credit", type: "credit", account_id: null },
  { id: "transfer", type: "transfer", account_id: null },
  { id: "debit-bac", type: "debit", account_id: "bac" },
  { id: "old-credit", type: "credit", account_id: "visa", is_archived: true },
];

describe("methodForAccount", () => {
  it("tarjeta de crédito → Tarjeta de crédito", () => {
    expect(methodForAccount({ id: "amex", type: "credit_card" }, methods)).toBe("credit");
  });
  it("cuenta bancaria → Transferencia, salvo que tenga un método ligado", () => {
    expect(methodForAccount({ id: "agricola", type: "checking" }, methods)).toBe("transfer");
    expect(methodForAccount({ id: "bac", type: "checking" }, methods)).toBe("debit-bac");
  });
  it("efectivo → Efectivo; ignora archivados; sin coincidencia → null", () => {
    expect(methodForAccount({ id: "billetera", type: "cash" }, methods)).toBe("cash");
    expect(methodForAccount({ id: "visa", type: "credit_card" }, methods)).toBe("credit");
    expect(methodForAccount({ id: "x", type: "investment" }, methods)).toBeNull();
    expect(methodForAccount(undefined, methods)).toBeNull();
  });
});
