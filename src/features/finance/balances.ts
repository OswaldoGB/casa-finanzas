export type MoneyMovement = {
  type: "income" | "expense" | "transfer" | "loan_out" | "loan_repayment";
  status: "posted" | "pending";
  amountCents: number;
  sourceAccountId?: string;
  destinationAccountId?: string;
};

export type BalanceAccount = {
  id: string;
  type:
    "cash" | "checking" | "savings" | "credit_card" | "investment" | "other";
  openingBalanceCents: number;
};

export function decimalToCents(value: string | number): number {
  const text = String(value);
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(text))
    throw new RangeError("Amount must have at most two decimal places");

  const negative = text.startsWith("-");
  const [whole, fraction = ""] = (negative ? text.slice(1) : text).split(".");
  const cents =
    BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0") || "0");
  if (cents > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("Amount exceeds safe integer cents");
  return Number(cents) * (negative ? -1 : 1);
}

export function accountBalanceCents(
  account: BalanceAccount,
  movements: readonly MoneyMovement[],
): number {
  const debtSign = account.type === "credit_card" ? -1 : 1;
  return movements.reduce((balance, movement) => {
    if (movement.status !== "posted") return balance;
    const incoming =
      movement.destinationAccountId === account.id ? movement.amountCents : 0;
    const outgoing =
      movement.sourceAccountId === account.id ? movement.amountCents : 0;
    return balance + debtSign * (incoming - outgoing);
  }, account.openingBalanceCents);
}

export function netAccountAssetsCents(
  accounts: readonly { type: BalanceAccount["type"]; balanceCents: number }[],
): number {
  return accounts.reduce(
    (total, account) =>
      total +
      (account.type === "credit_card"
        ? -account.balanceCents
        : account.balanceCents),
    0,
  );
}
