type Line = {
  id: string;
  quantity: number;
  estimated_price: number | null;
  is_settled: boolean;
};
type Link = { cost_line_id: string; transaction_id: string };
type Expense = { id: string; amount: number; status: string };
export type TripTotalsInput = {
  project: { budget: number };
  shoppingSummary: { estimated: number; pending: number; missing: number };
  costLines: Line[];
  costTransactions: Link[];
  transactions: Expense[];
};
const cents = (value: number) => Math.round(value * 100);
export function tripCostBreakdown(
  line: Line,
  links: Link[],
  transactions: Expense[],
) {
  const ids = new Set(
    links
      .filter((l) => l.cost_line_id === line.id)
      .map((l) => l.transaction_id),
  );
  const unique = new Map(
    transactions
      .filter((t) => t.status === "posted" && ids.has(t.id))
      .map((t) => [t.id, t]),
  );
  const real = unique.size
    ? [...unique.values()].reduce((sum, t) => sum + cents(t.amount), 0) / 100
    : null;
  const estimated =
    line.estimated_price == null
      ? null
      : Number(
          (BigInt(cents(line.estimated_price)) *
            BigInt(Math.round(line.quantity * 1000)) +
            BigInt(500)) /
            BigInt(1000),
        ) / 100;
  const pending = line.is_settled
    ? 0
    : Math.max(0, (cents(estimated ?? 0) - cents(real ?? 0)) / 100);
  return {
    estimated,
    real,
    pending,
    difference:
      line.is_settled && estimated != null && real != null
        ? (cents(estimated) - cents(real)) / 100
        : null,
  };
}
export function tripTotals(data: TripTotalsInput) {
  const unique = new Map(
    data.transactions
      .filter((t) => t.status === "posted")
      .map((t) => [t.id, t]),
  );
  const real =
    [...unique.values()].reduce((sum, t) => sum + cents(t.amount), 0) / 100;
  const lines = data.costLines.map((line) =>
    tripCostBreakdown(line, data.costTransactions, data.transactions),
  );
  const estimated =
    (cents(data.shoppingSummary.estimated) +
      lines.reduce((sum, l) => sum + cents(l.estimated ?? 0), 0)) /
    100;
  const pending =
    (cents(data.shoppingSummary.pending) +
      lines.reduce((sum, l) => sum + cents(l.pending), 0)) /
    100;
  const projected = (cents(real) + cents(pending)) / 100;
  return {
    maximum: data.project.budget,
    estimated,
    real,
    pending,
    projected,
    margin: (cents(data.project.budget) - cents(projected)) / 100,
    missingPrices:
      data.shoppingSummary.missing +
      lines.filter((l) => l.estimated == null).length,
    difference: (cents(estimated) - cents(real)) / 100,
  };
}
