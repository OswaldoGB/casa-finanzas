"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/permissions/queries";
import type { FormState } from "@/features/auth/schemas";
import { recurringRuleSchema } from "./schemas";

const idSchema = z.string().uuid();

export async function saveRecurringRule(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireAdmin();
  const parsed = recurringRuleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const rawId = formData.get("id");
  const id = rawId ? idSchema.safeParse(rawId) : null;
  if (id && !id.success) return { error: "Recurrente inválido." };

  const value = parsed.data;
  const [
    accountResult,
    destinationResult,
    categoryResult,
    methodResult,
    currentResult,
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("id,is_archived")
      .eq("id", value.accountId)
      .eq("household_id", profile.household_id)
      .maybeSingle(),
    value.destinationAccountId
      ? supabase
          .from("accounts")
          .select("id,is_archived")
          .eq("id", value.destinationAccountId)
          .eq("household_id", profile.household_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    value.categoryId
      ? supabase
          .from("categories")
          .select("id,type,is_archived")
          .eq("id", value.categoryId)
          .eq("household_id", profile.household_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    value.paymentMethodId
      ? supabase
          .from("payment_methods")
          .select("id,is_archived")
          .eq("id", value.paymentMethodId)
          .eq("household_id", profile.household_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    id?.success
      ? supabase
          .from("recurring_rules")
          .select("id,start_date,next_run_date")
          .eq("id", id.data)
          .eq("household_id", profile.household_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (
    accountResult.error ||
    destinationResult.error ||
    categoryResult.error ||
    methodResult.error ||
    currentResult.error
  )
    return { error: "No se pudieron validar las referencias del recurrente." };
  if (
    !accountResult.data ||
    accountResult.data.is_archived ||
    (value.destinationAccountId &&
      (!destinationResult.data || destinationResult.data.is_archived)) ||
    (value.categoryId &&
      (!categoryResult.data ||
        categoryResult.data.is_archived ||
        categoryResult.data.type !== value.type)) ||
    (value.paymentMethodId &&
      (!methodResult.data || methodResult.data.is_archived))
  )
    return { error: "Elige cuenta, categoría y método activos de tu hogar." };
  if (id?.success && !currentResult.data)
    return { error: "Recurrente no encontrado." };

  const nextRunDate =
    currentResult.data?.start_date === value.startDate
      ? currentResult.data.next_run_date
      : value.startDate;
  const values = {
    name: value.name,
    type: value.type,
    amount: value.amount,
    account_id: value.accountId,
    destination_account_id: value.destinationAccountId,
    category_id: value.categoryId,
    payment_method_id: value.paymentMethodId,
    description: value.description,
    notes: value.notes || null,
    frequency: value.frequency,
    interval_count: value.intervalCount,
    start_date: value.startDate,
    end_date: value.endDate,
    next_run_date: nextRunDate,
    mode: value.mode,
    is_active: !value.endDate || nextRunDate <= value.endDate,
  };
  const result = id?.success
    ? await supabase
        .from("recurring_rules")
        .update(values)
        .eq("id", id.data)
        .eq("household_id", profile.household_id)
        .select("id")
        .single()
    : await supabase
        .from("recurring_rules")
        .insert({
          ...values,
          household_id: profile.household_id,
          created_by: profile.id,
        })
        .select("id")
        .single();
  if (result.error) return { error: "No se pudo guardar el recurrente." };
  revalidatePath("/settings");
  return { ok: "Recurrente guardado." };
}

export async function deactivateRecurringRule(formData: FormData) {
  const { supabase, profile } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const { error } = await supabase
    .from("recurring_rules")
    .update({ is_active: false })
    .eq("id", id.data)
    .eq("household_id", profile.household_id);
  if (error) throw new Error("No se pudo desactivar el recurrente.");
  revalidatePath("/settings");
}

export async function deleteRecurringRule(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Recurrente inválido." };
  const { error } = await supabase
    .from("recurring_rules")
    .delete()
    .eq("id", id.data)
    .eq("household_id", profile.household_id);
  if (error)
    return {
      error: "No se puede borrar un recurrente con movimientos. Desactívalo.",
    };
  revalidatePath("/settings");
  return { ok: "Recurrente eliminado." };
}
