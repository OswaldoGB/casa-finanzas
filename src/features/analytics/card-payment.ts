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
  today = dueOn,
) {
  const effectiveDue = dueOn < today ? today : dueOn;
  const repayments = planned
    .filter(
      (item) => item.repaymentCardId === cardId && item.date <= effectiveDue,
    )
    .reduce((sum, item) => sum + Math.abs(decimalToCents(item.amount)), 0);
  return Math.max(0, decimalToCents(unpaid) - repayments) / 100;
}
