"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/features/permissions/queries";
import type { FormState } from "@/features/auth/schemas";
import { shoppingSchema, buySchema } from "./schemas";

export async function saveShopping(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("shopping", "edit");
  const parsed = shoppingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const id = String(form.get("id") ?? "");
  if (id && !z.string().uuid().safeParse(id).success)
    return { error: "Compra inválida." };
  const result = id
    ? await supabase
        .from("shopping_items")
        .update(parsed.data)
        .eq("id", id)
        .eq("household_id", profile.household_id)
        .neq("status", "bought")
        .select("id")
        .maybeSingle()
    : await supabase
        .from("shopping_items")
        .insert({
          ...parsed.data,
          household_id: profile.household_id,
          created_by: profile.id,
        })
        .select("id")
        .single();
  if (result.error || !result.data)
    return {
      error: "No se pudo guardar. Las compras realizadas no se pueden reabrir.",
    };
  revalidatePath("/shopping");
  return { ok: "Compra guardada." };
}
export async function deleteShopping(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("shopping", "edit");
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Compra inválida." };
  const result = await supabase
    .from("shopping_items")
    .delete()
    .eq("id", id.data)
    .eq("household_id", profile.household_id)
    .select("id")
    .maybeSingle();
  if (result.error || !result.data)
    return { error: "No se pudo eliminar la compra." };
  revalidatePath("/shopping");
  return { ok: "Compra eliminada. Su movimiento permanece en Movimientos." };
}
export async function buyShopping(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const access = await requireModule("shopping", "edit");
  await requireModule("transactions", "edit");
  const parsed = buySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  if (parsed.data.create_inventory) await requireModule("inventory", "edit");
  const value = parsed.data;
  const result = await access.supabase.rpc("shopping_buy", {
    p_item_id: value.id,
    p_amount: value.amount,
    p_account_id: value.account_id,
    p_category_id: value.category_id,
    p_payment_method_id: value.payment_method_id ?? undefined,
    p_create_inventory: value.create_inventory,
    p_date: value.date,
  });
  if (result.error)
    return {
      error:
        "No se pudo registrar. Revisa cuenta/categoría activa y que la compra siga pendiente.",
    };
  for (const path of [
    "/shopping",
    "/transactions",
    "/accounts",
    "/inventory",
    "/dashboard",
    "/reports",
    "/budgets",
    "/projections",
  ])
    revalidatePath(path);
  return { ok: "Compra registrada como gasto." };
}
