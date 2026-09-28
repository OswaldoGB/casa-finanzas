"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/permissions/queries";
import type { FormState } from "@/features/auth/schemas";
import { categorySchema, paymentMethodSchema } from "./schemas";
import {
  dropCategoryWithinSiblings,
  moveCategoryWithinSiblings,
} from "./category-order";

const idSchema = z.string().uuid();

export async function moveCategory(formData: FormData) {
  const { supabase, profile } = await requireAdmin();
  const parsed = z
    .union([
      z.object({ id: idSchema, direction: z.enum(["up", "down"]) }),
      z.object({ id: idSchema, targetId: idSchema }),
    ])
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Movimiento de categoría inválido.");
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id,type,parent_id,sort_order,name")
    .eq("household_id", profile.household_id)
    .eq("is_archived", false);
  if (error) throw new Error("No se pudieron cargar las categorías.");
  const orderedIds =
    "targetId" in parsed.data
      ? dropCategoryWithinSiblings(
          categories,
          parsed.data.id,
          parsed.data.targetId,
        )
      : moveCategoryWithinSiblings(
          categories,
          parsed.data.id,
          parsed.data.direction,
        );
  if (!orderedIds) return;
  for (const [index, id] of orderedIds.entries()) {
    const { error: updateError } = await supabase
      .from("categories")
      .update({ sort_order: index + 1 })
      .eq("id", id)
      .eq("household_id", profile.household_id)
      .eq("is_archived", false);
    if (updateError)
      throw new Error("No se pudo guardar el orden de las categorías.");
  }
  revalidatePath("/settings");
}

export async function saveCategory(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireAdmin();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const id = formData.get("id");
  if (id && (typeof id !== "string" || !idSchema.safeParse(id).success))
    return { error: "Categoría inválida." };
  if (parsed.data.parentId) {
    if (id === parsed.data.parentId)
      return { error: "Una categoría no puede ser su propia subcategoría." };
    const { data: parent } = await supabase
      .from("categories")
      .select("id, type, parent_id")
      .eq("id", parsed.data.parentId)
      .eq("household_id", profile.household_id)
      .maybeSingle();
    if (!parent || parent.type !== parsed.data.type || parent.parent_id) {
      return { error: "Elige una categoría principal del mismo tipo." };
    }
  }
  const values = {
    name: parsed.data.name,
    type: parsed.data.type,
    parent_id: parsed.data.parentId ?? null,
    color: parsed.data.color,
    icon: parsed.data.icon,
  };
  const result = id
    ? await supabase
        .from("categories")
        .update(values)
        .eq("id", id)
        .eq("household_id", profile.household_id)
        .select("id")
        .single()
    : await supabase
        .from("categories")
        .insert({
          ...values,
          household_id: profile.household_id,
          created_by: profile.id,
        })
        .select("id")
        .single();
  if (result.error)
    return {
      error:
        "No se pudo guardar la categoría. Revisa sus datos e inténtalo de nuevo.",
    };
  revalidatePath("/settings");
  return { ok: "Categoría guardada." };
}

export async function archiveCategory(formData: FormData) {
  const { supabase, profile } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const { error } = await supabase
    .from("categories")
    .update({ is_archived: true })
    .eq("id", id.data)
    .eq("household_id", profile.household_id);
  if (error) throw new Error("No se pudo archivar la categoría.");
  revalidatePath("/settings");
}

export async function savePaymentMethod(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireAdmin();
  const parsed = paymentMethodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const id = formData.get("id");
  if (id && (typeof id !== "string" || !idSchema.safeParse(id).success))
    return { error: "Método inválido." };
  if (parsed.data.accountId) {
    const { data: account } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", parsed.data.accountId)
      .eq("household_id", profile.household_id)
      .maybeSingle();
    if (!account)
      return { error: "La cuenta vinculada no pertenece a tu hogar." };
  }
  const values = {
    name: parsed.data.name,
    type: parsed.data.type,
    account_id: parsed.data.accountId,
  };
  const result = id
    ? await supabase
        .from("payment_methods")
        .update(values)
        .eq("id", id)
        .eq("household_id", profile.household_id)
        .select("id")
        .single()
    : await supabase
        .from("payment_methods")
        .insert({
          ...values,
          household_id: profile.household_id,
          created_by: profile.id,
        })
        .select("id")
        .single();
  if (result.error) return { error: "No se pudo guardar el método de pago." };
  revalidatePath("/settings");
  return { ok: "Método de pago guardado." };
}

export async function archivePaymentMethod(formData: FormData) {
  const { supabase, profile } = await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  const { error } = await supabase
    .from("payment_methods")
    .update({ is_archived: true })
    .eq("id", id.data)
    .eq("household_id", profile.household_id);
  if (error) throw new Error("No se pudo archivar el método de pago.");
  revalidatePath("/settings");
}
