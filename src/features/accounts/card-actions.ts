"use server";

import { revalidatePath } from "next/cache";
import { requireModule } from "../permissions/queries";
import type { FormState } from "../auth/schemas";
import { installmentSchema, cardPaymentSchema } from "./card-schemas";
import { accountIdSchema } from "./schemas";

function refresh(card: string) {
  for (const path of [
    "/accounts",
    `/accounts/${card}`,
    "/transactions",
    "/dashboard",
    "/projections",
    "/reports",
    "/budgets",
  ])
    revalidatePath(path);
}
export async function saveInstallment(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("accounts", "edit");
  const parsed = installmentSchema.safeParse(Object.fromEntries(form));
  const requestId = accountIdSchema.safeParse(form.get("request_id"));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  if (!requestId.success)
    return { error: "Solicitud inválida. Recarga la página." };
  const plan = parsed.data;
  if (plan.mode === "new") await requireModule("transactions", "edit");
  const { error } = await supabase.rpc("create_card_installment", {
    p_id: requestId.data,
    p_card_id: plan.card_id,
    p_name: plan.name,
    p_amount: plan.amount,
    p_installments: plan.installments,
    p_purchase_date: plan.purchase_date,
    p_first_close: plan.first_close,
    p_existing: plan.mode === "existing",
    p_category_id: plan.category_id ?? undefined,
  });
  if (error) return { error: error.message };
  refresh(plan.card_id);
  return {
    ok:
      plan.mode === "existing"
        ? "Plan registrado sin volver a sumar la deuda."
        : "Compra y plan de cuotas registrados.",
  };
}
export async function payCard(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("accounts", "edit");
  await requireModule("transactions", "edit");
  const ids = form.getAll("source_id");
  const amounts = form.getAll("source_amount");
  const parsed = cardPaymentSchema.safeParse({
    card_id: form.get("card_id"),
    date: form.get("date"),
    sources: ids
      .map((account_id, index) => ({ account_id, amount: amounts[index] }))
      .filter(
        (row) =>
          row.amount !== "" && row.amount !== "0" && row.amount !== "0.00",
      ),
  });
  const requestId = accountIdSchema.safeParse(form.get("request_id"));
  if (!parsed.success || !requestId.success)
    return {
      error:
        "Indica al menos una cuenta y un importe válido. No repitas cuentas.",
    };
  const { error } = await supabase.rpc("pay_credit_card", {
    p_id: requestId.data,
    p_card_id: parsed.data.card_id,
    p_date: parsed.data.date,
    p_sources: parsed.data.sources,
  });
  if (error) return { error: error.message };
  refresh(parsed.data.card_id);
  return {
    ok: "Pago registrado. Se actualizaron la tarjeta y las cuentas de origen.",
  };
}
export async function removeInstallment(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("accounts", "edit");
  const id = accountIdSchema.safeParse(form.get("id"));
  const card = accountIdSchema.safeParse(form.get("card_id"));
  if (!id.success || !card.success || form.get("confirm") !== "on")
    return {
      error: "Confirma que el importe pendiente pasará a ser deuda al contado.",
    };
  const { error } = await supabase.rpc("remove_card_installment", {
    p_id: id.data,
  });
  if (error) return { error: error.message };
  refresh(card.data);
  return { ok: "Financiación retirada. El gasto y la deuda se conservan." };
}
