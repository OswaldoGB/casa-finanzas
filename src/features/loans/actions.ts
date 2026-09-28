"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import type { FormState } from "@/features/auth/schemas";
import { loanSchema, loanSourceSchema, repaymentSchema } from "./schemas";
function refresh() {
  for (const path of [
    "/loans",
    "/accounts",
    "/transactions",
    "/dashboard",
    "/reports",
    "/projections",
  ])
    revalidatePath(path);
}
export async function createLoan(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile, permissions } = await requireModule(
    "loans",
    "edit",
  );
  if (!canAccess(profile.role, permissions, "transactions", "edit"))
    return { error: "Necesitas permiso para editar movimientos." };
  const parsed = loanSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  const v = parsed.data;
  const result = await supabase.rpc("loan_create_with_balance_effect", {
    p_debtor: v.debtor,
    p_amount: v.amount,
    p_date: v.date,
    p_expected_payment_date: v.expected_payment_date || undefined,
    p_notes: v.notes,
    p_account_id: v.account_id,
    p_already_recorded: v.balance_effect === "already_recorded",
  });
  if (result.error) return { error: result.error.message };
  refresh();
  return {
    ok:
      v.balance_effect === "already_recorded"
        ? "Préstamo registrado sin volver a mover el saldo."
        : "Préstamo registrado y saldo actualizado.",
  };
}
export async function updateLoanSource(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile, permissions } = await requireModule(
    "loans",
    "edit",
  );
  if (!canAccess(profile.role, permissions, "transactions", "edit"))
    return { error: "Necesitas permiso para editar movimientos." };
  const parsed = loanSourceSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const value = parsed.data;
  const result = await supabase.rpc("loan_update_source", {
    p_loan_id: value.id,
    p_account_id: value.account_id,
    p_already_recorded: value.balance_effect === "already_recorded",
  });
  if (result.error) return { error: result.error.message };
  refresh();
  return { ok: "Origen del préstamo corregido." };
}
export async function repayLoan(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile, permissions } = await requireModule(
    "loans",
    "edit",
  );
  if (!canAccess(profile.role, permissions, "transactions", "edit"))
    return { error: "Necesitas permiso para editar movimientos." };
  const parsed = repaymentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const result = await supabase.rpc("loan_repay", {
    p_loan_id: v.id,
    p_amount: v.amount,
    p_date: v.date,
    p_account_id: v.account_id,
  });
  if (result.error) return { error: result.error.message };
  refresh();
  return { ok: "Abono registrado." };
}
export async function writeOffLoan(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("loans", "edit");
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Préstamo inválido." };
  const result = await supabase.rpc("loan_write_off", { p_loan_id: id.data });
  if (result.error) return { error: result.error.message };
  refresh();
  return { ok: "Préstamo cerrado sin registrar un gasto." };
}
