"use server";

import { revalidatePath } from "next/cache";
import { requireModule } from "@/features/permissions/queries";
import type { FormState } from "@/features/auth/schemas";
import { transactionIdSchema, transactionSchema } from "./schemas";
import { bulkSelectionSchema, canRecategorize } from "./bulk";

export async function saveTransaction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("transactions", "edit");
  const parsed = transactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const id = formData.get("id");
  if (
    id &&
    (typeof id !== "string" || !transactionIdSchema.safeParse(id).success)
  )
    return { error: "Movimiento inválido." };
  const values = parsed.data;
  const existing = id
    ? await supabase
        .from("transactions")
        .select(
          "status,type,account_id,destination_account_id,category_id,payment_method_id",
        )
        .eq("id", id)
        .eq("household_id", profile.household_id)
        .maybeSingle()
    : null;
  if (id && (existing?.error || !existing?.data))
    return { error: "Movimiento no encontrado." };
  if (existing?.data?.status === "pending")
    return { error: "Confirma el movimiento pendiente antes de editarlo." };
  if (
    existing?.data &&
    !["income", "expense", "transfer"].includes(existing.data.type)
  )
    return { error: "Este tipo de movimiento no se edita aquí." };
  const accountIds = [values.account_id, values.destination_account_id].filter(
    (value): value is string => Boolean(value),
  );
  const [accounts, category, method] = await Promise.all([
    supabase
      .from("accounts")
      .select("id,is_archived")
      .eq("household_id", profile.household_id)
      .in("id", accountIds),
    values.category_id
      ? supabase
          .from("categories")
          .select("id,is_archived,type")
          .eq("household_id", profile.household_id)
          .eq("id", values.category_id)
          .maybeSingle()
      : Promise.resolve(null),
    values.payment_method_id
      ? supabase
          .from("payment_methods")
          .select("id,is_archived")
          .eq("household_id", profile.household_id)
          .eq("id", values.payment_method_id)
          .maybeSingle()
      : Promise.resolve(null),
  ]);
  if (
    accounts.error ||
    accounts.data?.length !== accountIds.length ||
    accounts.data.some(
      (account) =>
        account.is_archived &&
        account.id !== existing?.data?.account_id &&
        account.id !== existing?.data?.destination_account_id,
    )
  )
    return { error: "Selecciona cuentas activas del hogar." };
  if (
    values.category_id &&
    (!category ||
      category.error ||
      !category.data ||
      category.data.type !== values.type ||
      (category.data.is_archived &&
        category.data.id !== existing?.data?.category_id))
  )
    return { error: "La categoría no corresponde al tipo de movimiento." };
  if (
    values.payment_method_id &&
    (!method ||
      method.error ||
      !method.data ||
      (method.data.is_archived &&
        method.data.id !== existing?.data?.payment_method_id))
  )
    return { error: "El método de pago no está disponible." };
  const result = id
    ? await supabase
        .from("transactions")
        .update(values)
        .eq("id", id)
        .eq("household_id", profile.household_id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("transactions")
        .insert({
          ...values,
          household_id: profile.household_id,
          created_by: profile.id,
          status: "posted",
        })
        .select("id")
        .single();
  if (result.error || !result.data)
    return { error: "No se pudo guardar el movimiento." };
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  return { ok: id ? "Movimiento actualizado." : "Movimiento creado." };
}

export async function deleteTransaction(formData: FormData) {
  const { supabase, profile } = await requireModule("transactions", "edit");
  const parsed = transactionIdSchema.safeParse(formData.get("id"));
  if (!parsed.success) throw new Error("Movimiento inválido.");
  const { data: attachments, error: attachmentsError } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("household_id", profile.household_id)
    .eq("transaction_id", parsed.data);
  if (attachmentsError)
    throw new Error("No se pudieron revisar los comprobantes.");
  const paths = (attachments ?? []).map((item) => item.storage_path);
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { error } = await supabase.storage
      .from("receipts")
      .remove(paths.slice(offset, offset + 100));
    if (error) throw new Error("No se pudieron borrar los comprobantes.");
  }
  const { data, error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", parsed.data)
    .eq("household_id", profile.household_id)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("No se pudo borrar el movimiento.");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}

export async function confirmTransaction(formData: FormData) {
  const { supabase, profile } = await requireModule("transactions", "edit");
  const parsed = transactionIdSchema.safeParse(formData.get("id"));
  if (!parsed.success) throw new Error("Movimiento inválido.");
  const { data, error } = await supabase
    .from("transactions")
    .update({ status: "posted" })
    .eq("id", parsed.data)
    .eq("household_id", profile.household_id)
    .eq("status", "pending")
    .not("recurring_rule_id", "is", null)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("No se pudo confirmar el movimiento.");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}

export async function bulkTransactions(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("transactions", "edit");
  const ids = bulkSelectionSchema.safeParse(formData.getAll("ids"));
  if (!ids.success)
    return { error: "Selecciona entre 1 y 100 movimientos válidos." };
  const mode = formData.get("mode");
  if (mode !== "delete" && mode !== "recategorize")
    return { error: "Acción inválida." };
  const selected = await supabase
    .from("transactions")
    .select("id,type,status")
    .eq("household_id", profile.household_id)
    .in("id", ids.data);
  if (selected.error || selected.data?.length !== ids.data.length)
    return { error: "Algunos movimientos ya no están disponibles." };

  if (mode === "recategorize") {
    const categoryId = transactionIdSchema.safeParse(
      formData.get("category_id"),
    );
    if (!categoryId.success) return { error: "Elige una categoría válida." };
    const category = await supabase
      .from("categories")
      .select("id,type,is_archived")
      .eq("household_id", profile.household_id)
      .eq("id", categoryId.data)
      .eq("is_archived", false)
      .maybeSingle();
    if (
      category.error ||
      !category.data ||
      !canRecategorize(selected.data, category.data.type)
    )
      return {
        error:
          "Selecciona solo ingresos o solo gastos publicados y una categoría del mismo tipo.",
      };
    const result = await supabase
      .from("transactions")
      .update({ category_id: categoryId.data })
      .eq("household_id", profile.household_id)
      .in("id", ids.data)
      .select("id");
    if (result.error || result.data?.length !== ids.data.length)
      return { error: "No se pudieron recategorizar todos los movimientos." };
    revalidatePath("/transactions");
    return { ok: `${ids.data.length} movimientos recategorizados.` };
  }

  const attachments = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("household_id", profile.household_id)
    .in("transaction_id", ids.data);
  if (attachments.error)
    return { error: "No se pudieron revisar los comprobantes." };
  const paths = (attachments.data ?? []).map((item) => item.storage_path);
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { error } = await supabase.storage
      .from("receipts")
      .remove(paths.slice(offset, offset + 100));
    if (error) return { error: "No se pudieron borrar los comprobantes." };
  }
  const result = await supabase
    .from("transactions")
    .delete()
    .eq("household_id", profile.household_id)
    .in("id", ids.data)
    .select("id");
  if (result.error || result.data?.length !== ids.data.length)
    return { error: "No se pudieron borrar todos los movimientos." };
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  return { ok: `${ids.data.length} movimientos borrados.` };
}
