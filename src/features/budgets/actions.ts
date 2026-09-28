"use server";

import { revalidatePath } from "next/cache";
import { requireModule } from "@/features/permissions/queries";
import type { FormState } from "@/features/auth/schemas";
import { budgetIdSchema, budgetMonthSchema, budgetSchema } from "./schemas";

function refreshBudgets() {
  for (const path of ["/budgets", "/dashboard", "/projections"])
    revalidatePath(path);
}

export async function saveBudget(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("budgets", "edit");
  const parsed = budgetSchema.safeParse({
    ...Object.fromEntries(formData),
    carry_over: formData.get("carry_over") ?? "off",
  });
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const id = formData.get("id");
  if (id && !budgetIdSchema.safeParse(id).success)
    return { error: "Presupuesto inválido." };
  const result =
    typeof id === "string" && id
      ? await supabase
          .from("budgets")
          .update(parsed.data)
          .eq("id", id)
          .eq("household_id", profile.household_id)
          .select("id")
          .maybeSingle()
      : await supabase
          .from("budgets")
          .insert({
            ...parsed.data,
            household_id: profile.household_id,
            created_by: profile.id,
          })
          .select("id")
          .single();
  if (result.error || !result.data)
    return {
      error:
        result.error?.code === "23505"
          ? "Esta categoría ya tiene un presupuesto para el mes."
          : "No se pudo guardar. Revisa la categoría y vuelve a intentar.",
    };
  refreshBudgets();
  return { ok: "Presupuesto guardado." };
}

export async function deleteBudget(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("budgets", "edit");
  const id = budgetIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Presupuesto inválido." };
  const { data, error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id.data)
    .eq("household_id", profile.household_id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo eliminar el presupuesto." };
  refreshBudgets();
  return { ok: "Presupuesto eliminado." };
}

export async function copyPreviousBudgets(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("budgets", "edit");
  const month = budgetMonthSchema.safeParse(formData.get("month"));
  if (!month.success) return { error: "Mes inválido." };
  const { data, error } = await supabase.rpc("copy_previous_budgets", {
    p_month: month.data,
  });
  if (error) return { error: "No se pudieron copiar los presupuestos." };
  refreshBudgets();
  return {
    ok: data
      ? `${data} presupuestos copiados. Los existentes se conservaron.`
      : "No hay presupuestos nuevos para copiar del mes anterior.",
  };
}
