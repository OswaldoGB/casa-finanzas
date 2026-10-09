const cents = (amount: number) => Math.round(amount * 100);

export type StatementStatus = "pending" | "partial" | "settled";
export type InstallmentStatus = "future" | "included" | "settled";
export type CardStatementInstallmentSummary = {
  id: string;
  planId: string;
  installment: number;
  closeOn: string;
  dueOn: string;
  amount: number;
  paid: number;
  status: Exclude<InstallmentStatus, "future">;
};
export type CardStatementSummary = {
  id: string;
  closesOn: string;
  dueOn: string;
  appTotal: number;
  bankDue: number;
  paid: number;
  unpaid: number;
  note: string;
  status: StatementStatus;
  installments: CardStatementInstallmentSummary[];
};

export function statementSettlementStatus({
  bankDue,
  paid,
}: {
  bankDue: number;
  paid: number;
}): StatementStatus {
  if (cents(paid) >= cents(bankDue)) return "settled";
  return cents(paid) > 0 ? "partial" : "pending";
}

export function installmentSettlementStatus({
  amount,
  paid,
}: {
  amount: number;
  paid: number;
}): Exclude<InstallmentStatus, "future"> {
  return cents(paid) >= cents(amount) ? "settled" : "included";
}
