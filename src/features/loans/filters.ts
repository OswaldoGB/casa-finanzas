import type { Loan } from "./schemas";

export const loanFilters = ["all", "active", "partial", "paid"] as const;
export const loanSorts = [
  "date_desc",
  "date_asc",
  "amount_desc",
  "amount_asc",
] as const;
export type LoanFilter = (typeof loanFilters)[number];
export type LoanSort = (typeof loanSorts)[number];

export function readLoanFilters(params: { filter?: string; sort?: string }): {
  filter: LoanFilter;
  sort: LoanSort;
} {
  return {
    filter: loanFilters.includes(params.filter as LoanFilter)
      ? (params.filter as LoanFilter)
      : "all",
    sort: loanSorts.includes(params.sort as LoanSort)
      ? (params.sort as LoanSort)
      : "date_desc",
  };
}

export function organizeLoans(
  loans: Loan[],
  filter: LoanFilter,
  sort: LoanSort,
) {
  const compare = (a: Loan, b: Loan) => {
    if (sort === "amount_desc") return b.amount - a.amount;
    if (sort === "amount_asc") return a.amount - b.amount;
    if (sort === "date_asc") return a.date.localeCompare(b.date);
    return b.date.localeCompare(a.date);
  };
  const paid = loans.filter((loan) => loan.status === "paid");
  const current = loans.filter((loan) => !paid.includes(loan));
  const filtered =
    filter === "paid"
      ? []
      : current.filter((loan) =>
          filter === "partial"
            ? loan.status === "active" && loan.recovered > 0
            : filter === "active"
              ? loan.status === "active" && loan.recovered === 0
              : true,
        );
  return {
    current: filtered.sort(compare),
    paid: (filter === "all" || filter === "paid" ? paid : []).sort(compare),
  };
}
