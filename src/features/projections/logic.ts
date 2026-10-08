import {
  nextRecurringDate,
  type RecurrenceFrequency,
} from "../finance/recurrence";

export type ProjectionInput = {
  today: string;
  accounts: {
    id: string;
    name: string;
    type: string;
    balance: number;
    statement_closing_day: number | null;
    payment_due_day: number | null;
    statement_close: string | null;
    statement_unpaid: number;
    installment_future?: number;
    reconciled_due_on?: string | null;
    reconciled_unpaid?: number | null;
  }[];
  installments?: {
    card_id: string;
    close_date: string;
    due_date: string;
    amount: number;
  }[];
  recurring: {
    id: string;
    name: string;
    type:
      | "income"
      | "expense"
      | "transfer"
      | "loan_out"
      | "loan_repayment"
      | "goal_contribution"
      | "goal_withdrawal";
    amount: number;
    account_id: string | null;
    destination_account_id: string | null;
    category_id: string | null;
    frequency: RecurrenceFrequency;
    interval_count: number;
    start_date: string;
    end_date: string | null;
    next_run_date: string;
    mode: "auto" | "confirm";
  }[];
  budgets: {
    month: string;
    rows: {
      id: string;
      category_id: string;
      name: string;
      color: string;
      amount: number;
      carry_over: boolean;
      carried: number;
      available: number;
      spent: number;
    }[];
  }[];
};
export type Scenario = {
  type: "income" | "expense";
  amount: number;
  date: string;
};
const cents = (value: number) => Math.round(value * 100);
const liquid = (type: string) => ["cash", "checking", "savings"].includes(type);
const iso = (value: Date) => value.toISOString().slice(0, 10);
function monthDate(month: string, offset: number, day = 1) {
  const date = new Date(`${month.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return iso(date);
}
function chargeDue(date: string, closing: number, payment: number) {
  const close = monthDate(
    date,
    date <= monthDate(date, 0, closing) ? 0 : 1,
    closing,
  );
  return monthDate(
    close,
    monthDate(close, 0, payment) > close ? 0 : 1,
    payment,
  );
}

export function projectCash(
  input: ProjectionInput,
  months: 3 | 6 | 12 = 12,
  scenario?: Scenario,
) {
  const accounts = new Map(
    input.accounts.map((account) => [account.id, account]),
  );
  const end = monthDate(input.today, months);
  const events: { date: string; amount: number }[] = [];
  const cardPayments: { card: string; date: string; amount: number }[] = [];
  const credits: { card: string; date: string; amount: number }[] = [];
  const categoryExpenses = new Map<string, number>();
  for (const account of input.accounts) {
    if (
      account.type !== "credit_card" ||
      !account.statement_closing_day ||
      !account.payment_due_day
    )
      continue;
    const close =
      account.statement_close ??
      monthDate(input.today, -1, account.statement_closing_day);
    const estimatedDue = monthDate(
      close,
      monthDate(close, 0, account.payment_due_day) > close ? 0 : 1,
      account.payment_due_day,
    );
    const due = account.reconciled_due_on ?? estimatedDue;
    const unpaid = Math.max(
      0,
      cents(account.reconciled_unpaid ?? account.statement_unpaid),
    );
    const scheduledFuture = Math.max(0, cents(account.installment_future ?? 0));
    const future = Math.min(
      Math.max(0, cents(account.balance) - unpaid),
      scheduledFuture,
    );
    let remaining = future;
    let prepaid = scheduledFuture - future;
    for (const installment of (input.installments ?? [])
      .filter((row) => row.card_id === account.id)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))) {
      const covered = Math.min(prepaid, cents(installment.amount));
      prepaid -= covered;
      const amount = Math.min(remaining, cents(installment.amount) - covered);
      if (amount > 0)
        cardPayments.push({
          card: account.id,
          date:
            installment.due_date < input.today
              ? input.today
              : installment.due_date,
          amount,
        });
      remaining -= amount;
    }
    if (account.balance < 0)
      credits.push({
        card: account.id,
        date: input.today,
        amount: -cents(account.balance),
      });
    cardPayments.push({
      card: account.id,
      date: due < input.today ? input.today : due,
      amount: unpaid,
    });
    cardPayments.push({
      card: account.id,
      date: chargeDue(
        input.today,
        account.statement_closing_day,
        account.payment_due_day,
      ),
      amount: Math.max(0, cents(account.balance) - unpaid - future),
    });
  }
  for (const rule of input.recurring) {
    const source = rule.account_id ? accounts.get(rule.account_id) : undefined;
    const destination = rule.destination_account_id
      ? accounts.get(rule.destination_account_id)
      : undefined;
    if (!source) continue;
    let date = rule.next_run_date;
    while (date < end && (!rule.end_date || date <= rule.end_date)) {
      if (date >= input.today) {
        const amount = cents(rule.amount);
        let impact = 0;
        if (liquid(source.type))
          impact =
            rule.type === "income" || rule.type === "loan_repayment"
              ? amount
              : -amount;
        if (
          ["transfer", "goal_contribution", "goal_withdrawal"].includes(
            rule.type,
          ) &&
          destination &&
          liquid(destination.type)
        )
          impact += amount;
        events.push({ date, amount: impact });
        if (
          [
            "expense",
            "transfer",
            "loan_out",
            "goal_contribution",
            "goal_withdrawal",
          ].includes(rule.type) &&
          source.type === "credit_card" &&
          source.statement_closing_day &&
          source.payment_due_day
        )
          cardPayments.push({
            card: source.id,
            date: chargeDue(
              date,
              source.statement_closing_day,
              source.payment_due_day,
            ),
            amount,
          });
        if (
          ["income", "loan_repayment"].includes(rule.type) &&
          source.type === "credit_card"
        )
          credits.push({ card: source.id, date, amount });
        if (
          ["transfer", "goal_contribution", "goal_withdrawal"].includes(
            rule.type,
          ) &&
          destination?.type === "credit_card"
        )
          credits.push({ card: destination.id, date, amount });
        if (
          rule.type === "expense" &&
          rule.category_id &&
          (liquid(source.type) || source.type === "credit_card")
        ) {
          const key = `${date.slice(0, 7)}:${rule.category_id}`;
          categoryExpenses.set(key, (categoryExpenses.get(key) ?? 0) + amount);
        }
      }
      date = nextRecurringDate(
        date,
        rule.start_date,
        rule.frequency,
        rule.interval_count,
      );
    }
  }
  cardPayments.sort((a, b) => a.date.localeCompare(b.date));
  credits.sort((a, b) => a.date.localeCompare(b.date));
  for (const credit of credits) {
    let remaining = credit.amount;
    for (const payment of cardPayments) {
      if (payment.card !== credit.card || payment.date < credit.date) continue;
      const applied = Math.min(payment.amount, remaining);
      payment.amount -= applied;
      remaining -= applied;
    }
  }
  events.push(
    ...cardPayments.map((payment) => ({
      date: payment.date,
      amount: -payment.amount,
    })),
  );
  if (
    scenario &&
    scenario.amount > 0 &&
    Number.isFinite(scenario.amount) &&
    scenario.date >= input.today &&
    scenario.date < end
  )
    events.push({
      date: scenario.date,
      amount: cents(scenario.amount) * (scenario.type === "income" ? 1 : -1),
    });
  let balance = input.accounts
    .filter((account) => liquid(account.type))
    .reduce((sum, account) => sum + cents(account.balance), 0);
  const current = input.budgets.find(
    (budget) => budget.month.slice(0, 7) === input.today.slice(0, 7),
  );
  return Array.from({ length: months }, (_, index) => {
    const month = monthDate(input.today, index);
    const scheduled = events.filter(
      (event) => event.date.slice(0, 7) === month.slice(0, 7),
    );
    const budget = input.budgets.find(
      (item) => item.month.slice(0, 7) === month.slice(0, 7),
    );
    const explicit = new Map(
      (budget?.rows ?? []).map((row) => [row.category_id, row]),
    );
    const merged = new Map(
      (current?.rows ?? []).map((row) => [row.category_id, row]),
    );
    for (const [category, row] of explicit) merged.set(category, row);
    const budgetReserve = [...merged.values()].reduce((sum, row) => {
      const planned =
        index === 0
          ? Math.max(0, cents(row.available) - cents(row.spent))
          : explicit.has(row.category_id)
            ? cents(row.available)
            : cents(row.amount);
      return (
        sum +
        Math.max(
          0,
          planned -
            (categoryExpenses.get(`${month.slice(0, 7)}:${row.category_id}`) ??
              0),
        )
      );
    }, 0);
    const income = scheduled
      .filter((event) => event.amount > 0)
      .reduce((sum, event) => sum + event.amount, 0);
    const expense =
      budgetReserve -
      scheduled
        .filter((event) => event.amount < 0)
        .reduce((sum, event) => sum + event.amount, 0);
    balance += income - expense;
    return {
      month,
      income: income / 100,
      expense: expense / 100,
      budget: budgetReserve / 100,
      balance: balance / 100,
    };
  });
}
