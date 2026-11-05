import { decimalToCents } from "../finance/balances";

type AccountBalance = { type: string; balance: number };
type CashEvent = { date: string; cashImpact: number };

export function availableNetWorth(worth: number, reserved: number) {
  return (decimalToCents(worth) - decimalToCents(reserved)) / 100;
}

export function spendableBalance(
  accounts: readonly (AccountBalance & { id: string })[],
  goals: readonly { account_id: string | null; balance: number }[],
) {
  const liquidAccounts = accounts.filter((account) => ["cash", "checking", "savings"].includes(account.type));
  const ids = new Set(liquidAccounts.map((account) => account.id));
  const liquid = liquidAccounts.reduce((sum, account) => sum + decimalToCents(account.balance), 0);
  const reserved = goals.reduce((sum, goal) => sum + (goal.account_id && ids.has(goal.account_id) ? decimalToCents(goal.balance) : 0), 0);
  return { liquid: liquid / 100, reserved: reserved / 100, available: (liquid - reserved) / 100 };
}

export function accountNetWorth(accounts: readonly AccountBalance[]) {
  return (
    accounts.reduce(
      (total, account) =>
        total +
        decimalToCents(account.balance) *
          (account.type === "credit_card" ? -1 : 1),
      0,
    ) / 100
  );
}

export function cashFlowPoints(
  today: string,
  accounts: readonly AccountBalance[],
  upcoming: readonly CashEvent[],
) {
  const until = new Date(`${today}T00:00:00Z`);
  until.setUTCDate(until.getUTCDate() + 14);
  const end = until.toISOString().slice(0, 10);
  let balance = accounts
    .filter((account) => ["cash", "checking", "savings"].includes(account.type))
    .reduce((total, account) => total + decimalToCents(account.balance), 0);
  const days = new Map<string, number>();
  for (const event of upcoming) {
    if (event.date < today || event.date > end || event.cashImpact === 0)
      continue;
    days.set(
      event.date,
      (days.get(event.date) ?? 0) + decimalToCents(event.cashImpact),
    );
  }
  const points = [{ date: today, balance: balance / 100 }];
  for (const [date, impact] of [...days].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    balance += impact;
    points.push({ date, balance: balance / 100 });
  }
  return points;
}
