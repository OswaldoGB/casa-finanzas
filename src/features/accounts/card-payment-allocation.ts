type Installment = { id: string; amount: number; paid: number };
type Statement = {
  id: string;
  closesOn: string;
  unpaid: number;
  installments: Installment[];
};

export function planCardPayment(payment: number, statements: Statement[]) {
  let remaining = Math.max(0, Math.round(payment * 100));
  const statementAllocations: { statementId: string; amount: number }[] = [];
  const installmentAllocations: { installmentId: string; amount: number }[] = [];
  for (const statement of [...statements].sort(
    (a, b) => a.closesOn.localeCompare(b.closesOn) || a.id.localeCompare(b.id),
  )) {
    if (remaining <= 0) break;
    const unpaid = Math.max(0, Math.round(statement.unpaid * 100));
    const statementAmount = Math.min(remaining, unpaid);
    if (statementAmount <= 0) continue;
    statementAllocations.push({
      statementId: statement.id,
      amount: statementAmount / 100,
    });
    let installmentRemaining = statementAmount;
    for (const installment of statement.installments) {
      if (installmentRemaining <= 0) break;
      const unpaidInstallment = Math.max(
        0,
        Math.round((installment.amount - installment.paid) * 100),
      );
      const amount = Math.min(installmentRemaining, unpaidInstallment);
      if (amount > 0)
        installmentAllocations.push({
          installmentId: installment.id,
          amount: amount / 100,
        });
      installmentRemaining -= amount;
    }
    remaining -= statementAmount;
  }
  return { statements: statementAllocations, installments: installmentAllocations };
}
