"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/features/permissions/queries";
import type { FormState } from "@/features/auth/schemas";
import { inventorySchema } from "./schemas";

export async function saveInventory(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("inventory", "edit");
  const parsed = inventorySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const id = String(form.get("id") ?? "");
  if (id && !z.string().uuid().safeParse(id).success)
    return { error: "Artículo inválido." };
  const result = id
    ? await supabase
        .from("inventory_items")
        .update(parsed.data)
        .eq("id", id)
        .eq("household_id", profile.household_id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("inventory_items")
        .insert({
          ...parsed.data,
          household_id: profile.household_id,
          created_by: profile.id,
        })
        .select("id")
        .single();
  if (result.error || !result.data)
    return {
      error: "No se pudo guardar el artículo. Revisa el movimiento vinculado.",
    };
  revalidatePath("/inventory");
  return { ok: "Artículo guardado." };
}

async function itemAccess(id: string) {
  if (!z.string().uuid().safeParse(id).success)
    throw new Error("Artículo inválido.");
  const access = await requireModule("inventory", "edit");
  const result = await access.supabase
    .from("inventory_items")
    .select("id,photo_path")
    .eq("id", id)
    .eq("household_id", access.profile.household_id)
    .maybeSingle();
  if (result.error || !result.data) throw new Error("Artículo no encontrado.");
  return { ...access, item: result.data };
}

export async function deleteInventory(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const id = String(form.get("id") ?? "");
  try {
    const { supabase, profile, item } = await itemAccess(id);
    if (item.photo_path) {
      const removed = await supabase.storage
        .from("inventory")
        .remove([item.photo_path]);
      if (removed.error) return { error: "No se pudo borrar la foto." };
    }
    const result = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", id)
      .eq("household_id", profile.household_id)
      .select("id")
      .maybeSingle();
    if (result.error || !result.data)
      return {
        error:
          "No se pudo eliminar el artículo. Puede estar vinculado a una compra.",
      };
    revalidatePath("/inventory");
    return { ok: "Artículo eliminado." };
  } catch {
    return { error: "No se pudo eliminar el artículo." };
  }
}

export async function preparePhoto(id: string) {
  const { profile } = await itemAccess(id);
  return `${profile.household_id}/${id}/${randomUUID()}.jpg`;
}

export async function savePhoto(id: string, path: string, size: number) {
  const { supabase, profile, item } = await itemAccess(id);
  const prefix = `${profile.household_id}/${id}/`;
  if (
    !path.startsWith(prefix) ||
    !z.string().uuid().safeParse(path.slice(prefix.length, -4)).success ||
    !path.endsWith(".jpg") ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 10 * 1024 * 1024
  )
    throw new Error("Foto inválida.");
  const info = await supabase.storage.from("inventory").info(path);
  if (
    info.error ||
    !info.data ||
    info.data.contentType !== "image/jpeg" ||
    info.data.size !== size
  )
    throw new Error("No se pudo verificar la foto.");
  const result = await supabase
    .from("inventory_items")
    .update({ photo_path: path })
    .eq("id", id)
    .eq("household_id", profile.household_id)
    .select("id")
    .maybeSingle();
  if (result.error || !result.data)
    throw new Error("No se pudo guardar la foto.");
  if (item.photo_path && item.photo_path !== path)
    await supabase.storage.from("inventory").remove([item.photo_path]);
  revalidatePath("/inventory");
}
