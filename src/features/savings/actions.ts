"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import type { FormState } from "@/features/auth/schemas";
import { goalSchema, goalOperationSchema, restartSchema } from "./schemas";
function refresh() {
  for (const path of [
    "/savings",
    "/accounts",
    "/transactions",
    "/dashboard",
    "/projections",
    "/reports",
  ])
    revalidatePath(path);
}
export async function saveGoal(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("savings", "edit");
  const parsed = goalSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  const id = form.get("id");
  if (id && !z.string().uuid().safeParse(id).success)
    return { error: "Meta inválida." };
  const result =
    typeof id === "string" && id
      ? await supabase
          .from("savings_goals")
          .update(parsed.data)
          .eq("id", id)
          .eq("household_id", profile.household_id)
          .select("id")
          .maybeSingle()
      : await supabase
          .from("savings_goals")
          .insert({
            ...parsed.data,
            household_id: profile.household_id,
            created_by: profile.id,
          })
          .select("id")
          .single();
  if (result.error || !result.data)
    return { error: result.error?.message ?? "No se pudo guardar la meta." };
  refresh();
  return { ok: "Meta guardada." };
}
export async function restartProvision(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("savings", "edit");
  const parsed = restartSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const result = await supabase.rpc("provision_restart", {
    p_goal_id: parsed.data.id,
    p_transaction_id: parsed.data.transaction_id,
  });
  if (result.error) return { error: result.error.message };
  refresh();
  return { ok: "Compra ligada. La reserva vuelve a empezar desde $0." };
}
export async function operateGoal(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile, permissions } = await requireModule(
    "savings",
    "edit",
  );
  if (!canAccess(profile.role, permissions, "transactions", "edit"))
    return { error: "Necesitas permiso para editar movimientos." };
  const parsed = goalOperationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const result = await supabase.rpc("savings_goal_operation", {
    p_goal_id: v.id,
    p_type: v.type,
    p_amount: v.amount,
    p_date: v.date,
    p_counterparty_account_id: v.counterparty_account_id || undefined,
  });
  if (result.error) return { error: result.error.message };
  refresh();
  return {
    ok:
      v.type === "goal_contribution"
        ? "Aporte registrado."
        : "Retiro registrado.",
  };
}
export async function deleteGoal(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("savings", "edit");
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Meta inválida." };
  const result = await supabase
    .from("savings_goals")
    .delete()
    .eq("id", id.data)
    .eq("household_id", profile.household_id)
    .select("id")
    .maybeSingle();
  if (result.error || !result.data)
    return {
      error: "No se pudo eliminar. Las metas con movimientos se conservan.",
    };
  refresh();
  return { ok: "Meta eliminada." };
}
export type ExpenseOption = { id: string; description: string; amount: number; date: string };
/** Busca en todo el histórico de gastos (descripción o monto exacto) para "Ya lo compré". */
export async function searchExpenses(q: string): Promise<ExpenseOption[]> {
  const { supabase, profile, permissions } = await requireModule("savings", "edit");
  if (!canAccess(profile.role, permissions, "transactions", "view")) return [];
  // Solo letras, números, espacios y . - para no romper el filtro de PostgREST.
  const term = String(q ?? "").replace(/[^\p{L}\p{N} .-]/gu, "").trim().slice(0, 80);
  let query = supabase
    .from("transactions")
    .select("id,description,amount,date")
    .eq("household_id", profile.household_id)
    .eq("type", "expense")
    .eq("status", "posted")
    .order("date", { ascending: false })
    .limit(50);
  if (term) {
    const amount = /^\d+(\.\d{1,2})?$/.test(term) ? Number(term) : null;
    query = query.or(
      amount !== null ? `description.ilike.%${term}%,amount.eq.${amount}` : `description.ilike.%${term}%`,
    );
  }
  const { data, error } = await query;
  if (error) throw new Error("No se pudo buscar en tus gastos.");
  return data ?? [];
}
