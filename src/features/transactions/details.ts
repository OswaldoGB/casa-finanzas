const labels: Record<string, string> = {
  income: "Ingreso",
  expense: "Gasto",
  transfer: "Transferencia",
  loan_out: "Préstamo otorgado",
  loan_repayment: "Abono de préstamo",
  goal_contribution: "Aporte a meta",
  goal_withdrawal: "Retiro de meta",
};

export function transactionTypeLabel(type: string) {
  return labels[type] ?? type;
}

export function loanRepaymentSummary(loan: {
  debtor: string;
  amount: number;
  recovered_amount: number;
  date: string;
  expected_payment_date: string | null;
}) {
  return {
    debtor: loan.debtor,
    lent: loan.amount,
    recovered: loan.recovered_amount,
    pending: Math.max(0, loan.amount - loan.recovered_amount),
    date: loan.date,
    expectedPaymentDate: loan.expected_payment_date,
  };
}
