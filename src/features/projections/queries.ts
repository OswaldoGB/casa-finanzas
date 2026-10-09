import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { cardObligations } from "@/features/accounts/card-settlement";
import { cardStatementCycle } from "@/features/finance/card-cycle";
import { projectionInputSchema } from "./schemas";
import { collectPages } from "../exports/format";

export async function getProjectionInputs() {
  const { supabase, profile } = await requireModule("projections");
  const { data, error } = await supabase.rpc("projection_inputs", {
    p_months: 12,
  });
  if (error) throw new Error("No se pudo cargar la proyección de efectivo.");
  const parsed = projectionInputSchema.parse(data);
  const { data: statements, error: statementError } = await supabase
    .from("card_statements")
    .select(
      "card_id,closes_on,due_on,bank_cash_due,card_statement_allocations(amount),card_statement_installments(plan_id,installment,close_date)",
    )
    .eq("household_id", profile.household_id)
    .lte("closes_on", parsed.today)
    .order("closes_on");
  if (statementError)
    throw new Error("No se pudieron cargar los estados de tarjeta.");
  const reconciledInstallments = new Set(
    (statements ?? []).flatMap((item) =>
      item.card_statement_installments
        .filter((line) => line.close_date === item.closes_on)
        .map((line) => `${line.plan_id}:${line.installment}`),
    ),
  );
  const schedules = await Promise.all(
    parsed.accounts
      .filter((account) => account.type === "credit_card")
      .map(async (account) => {
        const rows = await collectPages(async (offset, size) => {
          const result = await supabase
            .rpc("card_installment_schedule", {
              p_card_id: account.id,
              p_after: account.statement_close ?? parsed.today,
              p_until: "9999-12-31",
            })
            .order("plan_id")
            .order("installment")
            .range(offset, offset + size - 1);
          if (result.error)
            throw new Error(
              "No se pudieron cargar las cuotas de la proyección.",
            );
          return result.data;
        });
        return rows.filter(
          (row) =>
            !reconciledInstallments.has(`${row.plan_id}:${row.installment}`),
        );
      }),
  );
  const installments = schedules.flat();
  return {
    ...parsed,
    installments,
    accounts: parsed.accounts.map((account) => {
      if (
        account.type !== "credit_card" ||
        !account.statement_closing_day ||
        !account.payment_due_day
      )
        return account;
      const cycle = cardStatementCycle(
        parsed.today,
        account.statement_closing_day,
        account.payment_due_day,
      );
      const known = (statements ?? [])
        .filter((item) => item.card_id === account.id)
        .map((item) => ({
          closesOn: item.closes_on,
          dueOn: item.due_on,
          unpaid:
            Math.max(
              0,
              Math.round(
                (Number(item.bank_cash_due) -
                  item.card_statement_allocations.reduce(
                    (sum, line) => sum + Number(line.amount),
                    0,
                  )) *
                  100,
              ),
            ) / 100,
        }));
      return {
        ...account,
        installment_future: installments
          .filter((row) => row.card_id === account.id)
          .reduce((sum, row) => sum + Number(row.amount), 0),
        reconciled_payments: cardObligations(
          {
            closesOn: account.statement_close ?? cycle.closesOn,
            dueOn: cycle.dueOn,
            unpaid: account.statement_unpaid,
          },
          known,
          parsed.today,
        ),
      };
    }),
  };
}
