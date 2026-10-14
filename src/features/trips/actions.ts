"use server";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/features/permissions/queries";
import type { FormState } from "@/features/auth/schemas";
import {
  tripSchema,
  activitySchema,
  costLineSchema,
  ingredientSchema,
  expenseSchema,
  uuid,
} from "./schemas";
export type TripFormState =
  (Exclude<FormState, undefined> & { id?: string }) | undefined;
function refresh(id?: string) {
  for (const path of [
    "/trips",
    "/projects",
    "/lists",
    "/transactions",
    "/accounts",
    "/budgets",
    "/dashboard",
    "/reports",
  ])
    revalidatePath(path);
  if (id) revalidatePath(`/trips/${id}`);
  revalidatePath("/trips/[id]", "page");
  revalidatePath("/lists/[id]", "page");
}
function errorMessage(
  error: { code?: string; message: string } | null,
  message: string,
) {
  return error?.code === "P0001" ? error.message : message;
}
export async function saveTrip(
  _: TripFormState,
  form: FormData,
): Promise<TripFormState> {
  const { supabase } = await requireModule("projects", "edit");
  const parsed = tripSchema.safeParse(Object.fromEntries(form));
  const id = String(form.get("id") ?? "");
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  if (id && !uuid.safeParse(id).success) return { error: "Viaje inválido." };
  const p = parsed.data;
  const { data, error } = await supabase.rpc("save_trip", {
    p_project_id: id || null,
    p_name: p.name,
    p_budget: p.budget,
    p_start_date: p.start_date,
    p_end_date: p.end_date,
    p_status: p.status,
    p_destination: p.destination,
    p_participants: p.participants,
    p_description: p.description,
  });
  if (error || !data)
    return { error: errorMessage(error, "No se pudo guardar el viaje.") };
  refresh(data);
  return { ok: "Viaje guardado.", id: data };
}
export async function saveActivity(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("projects", "edit");
  const parsed = activitySchema.safeParse(Object.fromEntries(form)),
    project = uuid.safeParse(form.get("project_id"));
  const id = String(form.get("id") ?? "");
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  if (!project.success || (id && !uuid.safeParse(id).success))
    return { error: "Actividad inválida." };
  const result = id
    ? await supabase
        .from("trip_activities")
        .update(parsed.data)
        .eq("id", id)
        .eq("project_id", project.data)
        .eq("household_id", profile.household_id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("trip_activities")
        .insert({
          ...parsed.data,
          project_id: project.data,
          household_id: profile.household_id,
          created_by: profile.id,
        })
        .select("id")
        .single();
  if (result.error || !result.data)
    return {
      error: errorMessage(result.error, "No se pudo guardar la actividad."),
    };
  refresh(project.data);
  return { ok: "Actividad guardada." };
}
export async function saveCostLine(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("projects", "edit");
  const parsed = costLineSchema.safeParse(Object.fromEntries(form)),
    project = uuid.safeParse(form.get("project_id"));
  const id = String(form.get("id") ?? "");
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  if (!project.success || (id && !uuid.safeParse(id).success))
    return { error: "Concepto inválido." };
  const result = id
    ? await supabase
        .from("trip_cost_lines")
        .update(parsed.data)
        .eq("id", id)
        .eq("project_id", project.data)
        .eq("household_id", profile.household_id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("trip_cost_lines")
        .insert({
          ...parsed.data,
          project_id: project.data,
          household_id: profile.household_id,
          created_by: profile.id,
        })
        .select("id")
        .single();
  if (result.error || !result.data)
    return {
      error: errorMessage(result.error, "No se pudo guardar el concepto."),
    };
  refresh(project.data);
  return { ok: "Concepto guardado." };
}
export async function linkActivityItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("projects", "edit");
  const parsed = ingredientSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const p = parsed.data;
  const result = p.item_id
    ? await supabase.rpc("link_trip_item", {
        p_activity_id: p.activity_id,
        p_item_id: p.item_id,
        p_quantity: p.quantity,
        p_unit: p.unit,
        p_adjust_purchase: form.get("adjust_purchase") === "on",
      })
    : await supabase.rpc("create_trip_activity_item", {
        p_activity_id: p.activity_id,
        p_name: p.name,
        p_quantity: p.quantity,
        p_unit: p.unit,
        p_estimated_price: p.estimated_price,
      });
  if (result.error)
    return {
      error: errorMessage(result.error, "No se pudo vincular el producto."),
    };
  refresh();
  return { ok: "Producto vinculado a la actividad." };
}
export async function linkCostTransaction(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("projects", "edit");
  const line = uuid.safeParse(form.get("line_id")),
    tx = uuid.safeParse(form.get("transaction_id"));
  if (!line.success || !tx.success)
    return { error: "Selecciona un concepto y un movimiento." };
  const { error } = await supabase.rpc("link_trip_cost_transaction", {
    p_line_id: line.data,
    p_transaction_id: tx.data,
    p_settle: form.get("is_settled") === "on",
  });
  if (error)
    return { error: errorMessage(error, "No se pudo vincular el gasto.") };
  refresh();
  return { ok: "Gasto existente vinculado; no se creó otro movimiento." };
}
export async function recordTripExpense(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("projects", "edit");
  const parsed = expenseSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const p = parsed.data;
  const { error } = await supabase.rpc("record_trip_expense", {
    p_line_id: p.line_id,
    p_amount: p.amount,
    p_date: p.date,
    p_account_id: p.account_id,
    p_category_id: p.category_id,
    p_method_id: p.payment_method_id,
    p_request_key: p.request_key,
    p_settle: p.is_settled,
  });
  if (error)
    return { error: errorMessage(error, "No se pudo registrar el gasto.") };
  refresh();
  return { ok: "Gasto registrado en el viaje." };
}
export async function prepareTripList(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("projects", "edit");
  const id = uuid.safeParse(form.get("project_id"));
  if (!id.success) return { error: "Viaje inválido." };
  const { error } = await supabase.rpc("ensure_trip_shopping_list", {
    p_project_id: id.data,
  });
  if (error)
    return { error: errorMessage(error, "No se pudo preparar la lista.") };
  refresh(id.data);
  return { ok: "Lista del viaje preparada." };
}
export async function assignListProject(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("projects", "edit");
  const list = uuid.safeParse(form.get("list_id")),
    project =
      String(form.get("project_id") ?? "") === "none"
        ? { success: true as const, data: null }
        : uuid.safeParse(form.get("project_id"));
  if (!list.success || !project.success)
    return { error: "Selecciona lista y proyecto." };
  const { error } = await supabase.rpc("assign_shopping_list_project", {
    p_list_id: list.data,
    p_project_id: project.data,
    p_confirm_financial_change: form.get("confirm_financial_change") === "on",
  });
  if (error)
    return { error: errorMessage(error, "No se pudo vincular la lista.") };
  refresh(project.data ?? undefined);
  return {
    ok: project.data
      ? "Lista y gastos vinculados al proyecto."
      : "Lista separada del proyecto.",
  };
}
export async function removeTripRecord(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("projects", "edit");
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return { error: "Registro inválido." };
  const kind = form.get("kind");
  const result =
    kind === "activity"
      ? await supabase.rpc("remove_trip_activity", { p_activity_id: id.data })
      : kind === "cost"
        ? await supabase
            .from("trip_cost_lines")
            .delete()
            .eq("id", id.data)
            .eq("household_id", profile.household_id)
        : kind === "ingredient"
          ? await supabase
              .from("trip_activity_items")
              .delete()
              .eq("id", id.data)
              .eq("household_id", profile.household_id)
          : null;
  if (!result || result.error)
    return { error: "No se pudo quitar el registro." };
  refresh();
  return { ok: "Registro quitado. Los movimientos y compras se conservan." };
}
