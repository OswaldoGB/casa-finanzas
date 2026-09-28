"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import type { FormState } from "@/features/auth/schemas";
import { itemSchema, listIdSchema, listSchema } from "./schemas";

function refresh(id?: string) {
  revalidatePath("/lists");
  if (id) revalidatePath(`/lists/${id}`);
}
export async function saveList(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("shopping_lists", "edit");
  const parsed = listSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const id = formData.get("id");
  if (id && !listIdSchema.safeParse(id).success)
    return { error: "Lista inválida." };
  const values = parsed.data;
  const result =
    typeof id === "string" && id
      ? await supabase
          .from("shopping_lists")
          .update(values)
          .eq("id", id)
          .eq("household_id", profile.household_id)
          .eq("status", "open")
          .select("id")
          .maybeSingle()
      : await supabase
          .from("shopping_lists")
          .insert({
            ...values,
            household_id: profile.household_id,
            created_by: profile.id,
          })
          .select("id")
          .single();
  if (result.error || !result.data)
    return { error: "No se pudo guardar la lista." };
  refresh(result.data.id);
  if (!id) redirect(`/lists/${result.data.id}`);
  return { ok: "Lista actualizada." };
}
export async function saveItem(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("shopping_lists", "edit");
  const listId = listIdSchema.safeParse(formData.get("list_id"));
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!listId.success) return { error: "Lista inválida." };
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const id = formData.get("id");
  if (id && !listIdSchema.safeParse(id).success)
    return { error: "Artículo inválido." };
  const values = parsed.data;
  const result =
    typeof id === "string" && id
      ? await supabase
          .from("shopping_list_items")
          .update(values)
          .eq("id", id)
          .eq("list_id", listId.data)
          .eq("household_id", profile.household_id)
          .select("id")
          .maybeSingle()
      : await supabase
          .from("shopping_list_items")
          .insert({
            ...values,
            list_id: listId.data,
            household_id: profile.household_id,
            created_by: profile.id,
          })
          .select("id")
          .single();
  if (result.error || !result.data)
    return {
      error: "No se pudo guardar el artículo. La lista debe estar abierta.",
    };
  refresh(listId.data);
  return { ok: "Artículo guardado." };
}
export async function updateCart(
  id: string,
  listId: string,
  values: { checked?: boolean; real_price?: number | null },
): Promise<FormState> {
  const { supabase, profile } = await requireModule("shopping_lists", "edit");
  const parsed = z
    .object({
      checked: z.boolean().optional(),
      real_price: z
        .number()
        .finite()
        .min(0)
        .max(999999999999.99)
        .refine(
          (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.001,
        )
        .nullable()
        .optional(),
    })
    .strict()
    .safeParse(values);
  if (
    !parsed.success ||
    !listIdSchema.safeParse(id).success ||
    !listIdSchema.safeParse(listId).success
  )
    return { error: "Datos inválidos." };
  const { data, error } = await supabase
    .from("shopping_list_items")
    .update(parsed.data)
    .eq("id", id)
    .eq("list_id", listId)
    .eq("household_id", profile.household_id)
    .select("id")
    .maybeSingle();
  if (error || !data)
    return {
      error:
        "No se pudo actualizar. Revisa tu conexión o si la lista sigue abierta.",
    };
  refresh(listId);
  return { ok: "Actualizado." };
}
export async function deleteItem(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("shopping_lists", "edit");
  const id = listIdSchema.safeParse(formData.get("id")),
    listId = listIdSchema.safeParse(formData.get("list_id"));
  if (!id.success || !listId.success) return { error: "Artículo inválido." };
  const { data, error } = await supabase
    .from("shopping_list_items")
    .delete()
    .eq("id", id.data)
    .eq("list_id", listId.data)
    .eq("household_id", profile.household_id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo eliminar el artículo." };
  refresh(listId.data);
  return { ok: "Artículo eliminado." };
}
export async function duplicateList(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("shopping_lists", "edit");
  const id = listIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Lista inválida." };
  const { data, error } = await supabase.rpc("duplicate_shopping_list", {
    p_list_id: id.data,
  });
  if (error || !data) return { error: "No se pudo duplicar la lista." };
  refresh();
  redirect(`/lists/${data}`);
}
export async function archiveList(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("shopping_lists", "edit");
  const id = listIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Lista inválida." };
  const { data, error } = await supabase
    .from("shopping_lists")
    .update({ status: "archived" })
    .eq("id", id.data)
    .eq("household_id", profile.household_id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo archivar la lista." };
  refresh(id.data);
  return { ok: "Lista archivada." };
}
export async function closeList(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile, permissions } = await requireModule(
    "shopping_lists",
    "edit",
  );
  if (!canAccess(profile.role, permissions, "transactions", "edit"))
    return { error: "Necesitas permiso para crear movimientos." };
  const parsed = z
    .object({
      id: listIdSchema,
      account_id: listIdSchema,
      category_id: listIdSchema,
      payment_method_id: z.union([z.literal(""), listIdSchema]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: "Selecciona una cuenta y una categoría válidas." };
  const { data, error } = await supabase.rpc("close_shopping_list", {
    p_list_id: parsed.data.id,
    p_account_id: parsed.data.account_id,
    p_category_id: parsed.data.category_id,
    p_payment_method_id: parsed.data.payment_method_id || undefined,
    p_carry_unchecked: formData.get("carry_unchecked") === "on",
  });
  if (error)
    return {
      error:
        "No se pudo cerrar la compra. Completa los precios reales del carrito y revisa los datos de pago.",
    };
  const result = z
    .object({
      transaction_id: z.string().uuid(),
      new_list_id: z.string().uuid().nullable(),
    })
    .safeParse(data);
  refresh(parsed.data.id);
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
  return {
    ok:
      result.success && result.data.new_list_id
        ? "Compra registrada. Los artículos pendientes están en una nueva lista."
        : "Compra registrada. Puedes adjuntar el recibo desde el movimiento.",
  };
}
