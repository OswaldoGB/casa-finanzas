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
  needsReview?: boolean;
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
  statementSettled = false,
}: {
  amount: number;
  paid: number;
  statementSettled?: boolean;
}): Exclude<InstallmentStatus, "future"> {
  return statementSettled || cents(paid) >= cents(amount)
    ? "settled"
    : "included";
}

export function cardCutSummary(
  estimate: {
    closesOn: string;
    dueOn: string;
    balance: number;
    unpaid: number;
  },
  statements: CardStatementSummary[],
  today: string,
) {
  const available = statements.filter((item) => item.closesOn <= today);
  const bank =
    [...available]
      .sort((a, b) => a.closesOn.localeCompare(b.closesOn))
      .find((item) => item.unpaid > 0) ??
    available.find((item) => item.closesOn === estimate.closesOn);
  return {
    bank,
    confirmed: Boolean(bank),
    closesOn: bank?.closesOn ?? estimate.closesOn,
    dueOn: bank?.dueOn ?? estimate.dueOn,
    unpaid: bank?.unpaid ?? estimate.unpaid,
    appTotal: bank?.appTotal ?? estimate.balance,
    difference: bank
      ? (cents(bank.appTotal) - cents(bank.bankDue)) / 100
      : null,
  };
}

type ScheduleRow = {
  plan_id: string;
  installment: number;
  close_date: string;
  due_date: string;
  amount: number;
};
export function cardObligations(
  estimate: { closesOn: string; dueOn: string; unpaid: number },
  statements: { closesOn: string; dueOn: string; unpaid: number }[],
  today: string,
) {
  const known = statements.filter((item) => item.closesOn <= today);
  const pending = known
    .filter((item) => cents(item.unpaid) > 0)
    .map(({ closesOn, dueOn, unpaid }) => ({ closesOn, dueOn, unpaid }));
  if (!known.some((item) => item.closesOn === estimate.closesOn)) {
    const unpaid =
      Math.max(
        0,
        cents(estimate.unpaid) -
          pending
            .filter((item) => item.closesOn <= estimate.closesOn)
            .reduce((sum, item) => sum + cents(item.unpaid), 0),
      ) / 100;
    if (unpaid > 0) pending.push({ ...estimate, unpaid });
  }
  return pending.sort((a, b) => a.closesOn.localeCompare(b.closesOn));
}
export function installmentProgress(
  previouslyPaid: number,
  schedule: ScheduleRow[],
  included: CardStatementInstallmentSummary[],
) {
  const rows = [...schedule]
    .sort((a, b) => a.installment - b.installment)
    .map((row) => {
      const recorded = included.find(
        (item) =>
          item.planId === row.plan_id && item.installment === row.installment,
      );
      const line = recorded?.needsReview ? undefined : recorded;
      const settled = line?.status === "settled";
      return {
        ...row,
        close_date: line?.closeOn ?? row.close_date,
        due_date: line?.dueOn ?? row.due_date,
        needsReview: Boolean(recorded?.needsReview),
        status: line?.status ?? ("future" as InstallmentStatus),
        paid: line?.paid ?? 0,
        remaining: settled
          ? 0
          : Math.max(0, cents(row.amount) - cents(line?.paid ?? 0)) / 100,
      };
    });
  return {
    rows,
    paidCount:
      previouslyPaid + rows.filter((row) => row.status === "settled").length,
    remaining: rows.reduce((sum, row) => sum + cents(row.remaining), 0) / 100,
    next: rows.find((row) => row.status !== "settled"),
  };
}
