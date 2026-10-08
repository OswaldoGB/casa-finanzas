type PendingStatement = {
  id: string;
  dueOn: string;
  closesOn: string;
  unpaid: number;
};

const cents = (amount: number) => Math.round(amount * 100);

export function allocatePayment(
  amount: number,
  statements: PendingStatement[],
) {
  let remaining = Math.max(0, cents(amount));
  return [...statements]
    .sort((a, b) =>
      a.dueOn === b.dueOn
        ? a.closesOn.localeCompare(b.closesOn)
        : a.dueOn.localeCompare(b.dueOn),
    )
    .flatMap((statement) => {
      const allocation = Math.min(
        remaining,
        Math.max(0, cents(statement.unpaid)),
      );
      remaining -= allocation;
      return allocation
        ? [{ statementId: statement.id, amount: allocation / 100 }]
        : [];
    });
}

export function summarizeStatement({
  appTotal,
  bankCashDue,
  allocated,
}: {
  appTotal: number;
  bankCashDue: number;
  allocated: number;
}) {
  const unpaid = Math.max(0, cents(bankCashDue) - cents(allocated)) / 100;
  return {
    appTotal,
    bankCashDue,
    difference: (cents(bankCashDue) - cents(appTotal)) / 100,
    allocated,
    unpaid,
    status: unpaid === 0 ? "paid" : allocated > 0 ? "partial" : "unpaid",
  } as const;
}
