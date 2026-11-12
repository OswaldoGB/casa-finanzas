"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import type { FormState } from "@/features/auth/schemas";
import { debtSchema, loanEditSchema, loanPersonAppearance, loanPersonName, loanPersonSelection, loanSchema, repaymentSchema } from "./schemas";
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
export async function saveLoanPerson(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, profile } = await requireModule("loans", "edit");
  const appearance = loanPersonAppearance.safeParse(Object.fromEntries(form));
  if (!appearance.success) return { error: appearance.error.issues[0].message };
  const id = form.get("id");
  if (id) {
    const person = z.string().uuid().safeParse(id);
    if (!person.success) return { error: "Persona inválida." };
    const { data, error } = await supabase.from("loan_people")
      .update(appearance.data)
      .eq("id", person.data)
      .eq("household_id", profile.household_id)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: "No se pudo actualizar la persona." };
    revalidatePath("/loans");
    return { ok: "Apariencia actualizada." };
  }
  const name = loanPersonName.safeParse(form.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };
  const { error } = await supabase.from("loan_people").insert({
    household_id: profile.household_id, name: name.data, ...appearance.data,
  });
  if (error) return { error: error.code === "23505" ? "Ya existe una persona con ese nombre." : "No se pudo guardar la persona." };
  revalidatePath("/loans");
  return { ok: "Persona agregada al catálogo." };
}

export async function setLoanPerson(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireModule("loans", "edit");
  const id = z.string().uuid().safeParse(form.get("id"));
  const person = loanPersonSelection.safeParse(form.get("person_id"));
  if (!id.success || !person.success) return { error: "Revisa el préstamo y la persona seleccionada." };
  const { error } = await supabase.rpc("loan_set_person", { p_loan_id: id.data, p_person_id: person.data });
  if (error) return { error: error.message };
  refresh();
  return { ok: person.data ? "Persona vinculada." : "Persona desvinculada." };
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
  const person = loanPersonSelection.safeParse(form.get("person_id") ?? "");
  if (!person.success) return { error: "Persona inválida." };
  const values = {
    p_amount: v.amount,
    p_date: v.date,
    p_expected_payment_date: v.expected_payment_date || undefined,
    p_notes: v.notes,
    p_account_id: v.account_id,
    p_already_recorded: v.balance_effect === "already_recorded",
  };
  const result = person.data
    ? await supabase.rpc("loan_create_for_person", { ...values, p_person_id: person.data, p_direction: "lent" })
    : await supabase.rpc("loan_create_with_balance_effect", { ...values, p_debtor: v.debtor });
  if (result.error) return { error: result.error.message };
  refresh();
  return {
    ok:
      v.balance_effect === "already_recorded"
        ? "Préstamo registrado sin volver a mover el saldo."
        : "Préstamo registrado y saldo actualizado.",
  };
}
export async function updateLoan(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile, permissions } = await requireModule(
    "loans",
    "edit",
  );
  if (!canAccess(profile.role, permissions, "transactions", "edit"))
    return { error: "Necesitas permiso para editar movimientos." };
  const parsed = loanEditSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const value = parsed.data;
  const result = await supabase.rpc("loan_update", {
    p_loan_id: value.id,
    p_debtor: value.debtor,
    p_amount: value.amount,
    p_date: value.date,
    p_expected_payment_date: value.expected_payment_date || undefined,
    p_notes: value.notes,
    p_account_id: value.account_id,
    p_already_recorded: value.balance_effect === "already_recorded",
  });
  if (result.error) return { error: result.error.message };
  refresh();
  return { ok: "Préstamo actualizado." };
}
export async function saveDebt(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("loans", "edit");
  const parsed = debtSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: parsed.error.issues[0].message, fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  const person = loanPersonSelection.safeParse(form.get("person_id") ?? "");
  if (!person.success) return { error: "Persona inválida." };
  const result = v.id
    ? await supabase.rpc("loan_update", {
        p_loan_id: v.id,
        p_debtor: v.creditor,
        p_amount: v.amount,
        p_date: v.date,
        p_expected_payment_date: v.expected_payment_date || undefined,
        p_notes: v.notes,
        p_already_recorded: false,
      })
    : person.data
      ? await supabase.rpc("loan_create_for_person", {
        p_person_id: person.data,
        p_direction: "borrowed",
        p_amount: v.amount,
        p_date: v.date,
        p_expected_payment_date: v.expected_payment_date || undefined,
        p_notes: v.notes,
      })
      : await supabase.rpc("debt_create", {
        p_creditor: v.creditor,
        p_amount: v.amount,
        p_date: v.date,
        p_expected_payment_date: v.expected_payment_date || undefined,
        p_notes: v.notes,
      });
  if (result.error) return { error: result.error.message };
  refresh();
  return { ok: v.id ? "Deuda actualizada." : "Deuda registrada." };
}
export async function payDebt(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile, permissions } = await requireModule("loans", "edit");
  if (!canAccess(profile.role, permissions, "transactions", "edit"))
    return { error: "Necesitas permiso para editar movimientos." };
  const parsed = repaymentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const result = await supabase.rpc("debt_pay", {
    p_loan_id: v.id,
    p_amount: v.amount,
    p_date: v.date,
    p_account_id: v.account_id,
  });
  if (result.error) return { error: result.error.message };
  refresh();
  return { ok: "Abono registrado." };
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
