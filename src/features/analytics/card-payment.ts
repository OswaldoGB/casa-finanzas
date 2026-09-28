import { decimalToCents } from "../finance/balances";

export function remainingCardPayment(
  unpaid: number,
  cardId: string,
  dueOn: string,
  planned: readonly {
    repaymentCardId: string | null;
    date: string;
    amount: number;
  }[],
) {
  const repayments = planned
    .filter((item) => item.repaymentCardId === cardId && item.date <= dueOn)
    .reduce((sum, item) => sum + Math.abs(decimalToCents(item.amount)), 0);
  return Math.max(0, decimalToCents(unpaid) - repayments) / 100;
}
