"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/features/permissions/queries";
import type { FormState } from "@/features/auth/schemas";
import { inventorySchema } from "./schemas";
import { initialStockSchema } from "./create-stock";

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
  if (id) {
    const current = await supabase.from("inventory_items").select("quantity").eq("id", id).eq("household_id", profile.household_id).maybeSingle();
    if (current.error || !current.data) return { error: "Artículo no encontrado." };
    parsed.data.quantity = current.data.quantity;
  }
  const stock = !id ? initialStockSchema.safeParse(Object.fromEntries(form)) : null;
  if (stock && !stock.success) return { error: "Revisa las cantidades y la presentación." };
  if (stock?.success && stock.data.mode === "packages") {
    const total = stock.data.package_count * stock.data.package_capacity;
    if (total > 9999999) return { error: "La cantidad total es demasiado grande." };
    const result = await supabase.rpc("inventory_create_with_packages", { p_item: parsed.data, p_label: stock.data.package_name, p_count: stock.data.package_count, p_capacity: stock.data.package_capacity, p_group: stock.data.group_name });
    if (result.error) return { error: "No se pudo guardar el artículo. Revisa el movimiento vinculado." };
    revalidatePath("/inventory");
    return { ok: "Artículo guardado." };
  }
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

export async function addInventoryPackages(_: FormState, form: FormData): Promise<FormState> {
  const { packageEntrySchema } = await import("./packages");
  const id = z.string().uuid().safeParse(form.get("item_id"));
  const data = packageEntrySchema.safeParse(Object.fromEntries(form));
  if (!id.success || !data.success) return { error: "Revisa la presentación y las cantidades." };
  const { supabase } = await requireModule("inventory", "edit");
  const result = await supabase.rpc("inventory_add_packages", { p_item: id.data, p_label: data.data.name, p_count: data.data.count, p_capacity: data.data.capacity, p_group_name: String(form.get("group_name") ?? "").trim().slice(0, 60) });
  if (result.error) return { error: "No se pudieron registrar los envases." };
  revalidatePath(`/inventory/${id.data}`); revalidatePath("/inventory");
  return { ok: "Envases agregados." };
}

export async function changeInventoryPackage(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ item_id: z.string().uuid(), package_id: z.string().uuid(), operation: z.enum(["open", "consume", "correct"]), amount: z.coerce.number().min(0).max(9999999).multipleOf(0.001), note: z.string().trim().max(500) }).safeParse(Object.fromEntries(form));
  if (!parsed.success || (parsed.data.operation === "consume" && parsed.data.amount <= 0) || (parsed.data.operation === "correct" && !parsed.data.note)) return { error: "Revisa la cantidad y explica las correcciones." };
  const { supabase } = await requireModule("inventory", "edit");
  const result = await supabase.rpc("inventory_package_change", { p_package: parsed.data.package_id, p_action: parsed.data.operation, p_amount: parsed.data.amount, p_note: parsed.data.note });
  if (result.error) return { error: "No se pudo aplicar el cambio. Revisa la cantidad disponible y vuelve a intentarlo." };
  revalidatePath(`/inventory/${parsed.data.item_id}`); revalidatePath("/inventory");
  return { ok: "Inventario actualizado." };
}

export async function setInventoryThreshold(_: FormState, form: FormData): Promise<FormState> {
  const id = z.string().uuid().safeParse(form.get("item_id"));
  const raw = String(form.get("threshold") ?? "").trim();
  const threshold = raw === "" ? null : Number(raw);
  if (!id.success || (threshold !== null && (!Number.isInteger(threshold) || threshold < 0 || threshold > 1000000))) return { error: "Introduce un mínimo válido." };
  const { supabase } = await requireModule("inventory", "edit");
  const result = await supabase.rpc("inventory_set_threshold", { p_item: id.data, p_threshold: threshold });
  if (result.error) return { error: "No se pudo guardar el mínimo." };
  revalidatePath(`/inventory/${id.data}`); revalidatePath("/inventory");
  return { ok: "Aviso de reposición actualizado." };
}
