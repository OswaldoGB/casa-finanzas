import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { projectionInputSchema } from "./schemas";
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
      "card_id,due_on,bank_cash_due,card_statement_allocations(amount),card_statement_installments(close_date,amount)",
    )
    .eq("household_id", profile.household_id)
    .gte("due_on", parsed.today)
    .order("due_on");
  if (statementError)
    throw new Error("No se pudieron cargar los estados de tarjeta.");
  const next = new Map<string, { due: string; unpaid: number }>();
  const reconciledInstallments = new Set<string>();
  for (const item of statements ?? []) {
    for (const installment of item.card_statement_installments ?? [])
      reconciledInstallments.add(
        `${item.card_id}:${installment.close_date}:${Number(installment.amount).toFixed(2)}`,
      );
    if (next.has(item.card_id)) continue;
    next.set(item.card_id, {
      due: item.due_on,
      unpaid: Math.max(
        0,
        Number(item.bank_cash_due) -
          (item.card_statement_allocations ?? []).reduce(
            (sum, allocation) => sum + Number(allocation.amount),
            0,
          ),
      ),
    });
  }
  return {
    ...parsed,
    installments: parsed.installments.filter(
      (installment) =>
        !reconciledInstallments.has(
          `${installment.card_id}:${installment.close_date}:${Number(installment.amount).toFixed(2)}`,
        ),
    ),
    accounts: parsed.accounts.map((account) => {
      const statement = next.get(account.id);
      return statement
        ? {
            ...account,
            reconciled_due_on: statement.due,
            reconciled_unpaid: statement.unpaid,
          }
        : account;
    }),
  };
}
