"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import type { FormState } from "@/features/auth/schemas";
import { goalSchema, goalOperationSchema } from "./schemas";
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
