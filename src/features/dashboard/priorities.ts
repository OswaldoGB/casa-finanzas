export type DashboardPriority =
  | { kind: "loan"; href: "/loans"; count: number; amount: number }
  | { kind: "budget"; href: "/budgets"; count: number; amount: number }
  | { kind: "cash"; href: "/projections"; amount: number }
  | {
      kind: "upcoming";
      href: "/projections";
      count: number;
      date: string;
    }
  | { kind: "clear" };

export function dashboardPriorities(input: {
  overdueLoans: { count: number; amount: number };
  atRiskBudgets: { count: number; amount: number };
  lowestProjectedCash: number;
  upcomingCount: number;
  nextUpcomingDate?: string;
}): DashboardPriority[] {
  const priorities: DashboardPriority[] = [];
  if (input.overdueLoans.count > 0)
    priorities.push({ kind: "loan", href: "/loans", ...input.overdueLoans });
  if (input.atRiskBudgets.count > 0)
    priorities.push({
      kind: "budget",
      href: "/budgets",
      ...input.atRiskBudgets,
    });
  if (input.lowestProjectedCash < 0)
    priorities.push({
      kind: "cash",
      href: "/projections",
      amount: input.lowestProjectedCash,
    });
  if (input.upcomingCount > 0 && input.nextUpcomingDate)
    priorities.push({
      kind: "upcoming",
      href: "/projections",
      count: input.upcomingCount,
      date: input.nextUpcomingDate,
    });
  return priorities.length ? priorities : [{ kind: "clear" }];
}
