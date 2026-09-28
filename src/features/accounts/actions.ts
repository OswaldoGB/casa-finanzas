"use server";

import { revalidatePath } from "next/cache";
import { requireModule } from "@/features/permissions/queries";
import type { FormState } from "@/features/auth/schemas";
import { accountIdSchema, accountSchema } from "./schemas";

export async function saveAccount(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("accounts", "edit");
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const id = formData.get("id");
  if (id && (typeof id !== "string" || !accountIdSchema.safeParse(id).success))
    return { error: "Cuenta inválida." };
  const values = parsed.data;
  if (id) {
    const { data: current, error } = await supabase
      .from("accounts")
      .select("type")
      .eq("id", id)
      .eq("household_id", profile.household_id)
      .maybeSingle();
    if (error || !current) return { error: "Cuenta no encontrada." };
    if (current.type !== values.type)
      return {
        error: "El tipo de una cuenta no se puede cambiar. Crea otra cuenta.",
      };
  }
  const result = id
    ? await supabase
        .from("accounts")
        .update(values)
        .eq("id", id)
        .eq("household_id", profile.household_id)
        .eq("is_archived", false)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("accounts")
        .insert({
          ...values,
          household_id: profile.household_id,
          created_by: profile.id,
        })
        .select("id")
        .single();
  if (result.error || !result.data)
    return {
      error:
        "No se pudo guardar la cuenta. Revisa los datos e intenta de nuevo.",
    };
  revalidatePath("/accounts");
  if (id) revalidatePath(`/accounts/${id}`);
  return { ok: id ? "Cuenta actualizada." : "Cuenta creada." };
}

export async function archiveAccount(formData: FormData) {
  const { supabase, profile } = await requireModule("accounts", "edit");
  const parsed = accountIdSchema.safeParse(formData.get("id"));
  if (!parsed.success) throw new Error("Cuenta inválida.");
  const { data, error } = await supabase
    .from("accounts")
    .update({ is_archived: true })
    .eq("id", parsed.data)
    .eq("household_id", profile.household_id)
    .eq("is_archived", false)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("No se pudo archivar la cuenta.");
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${parsed.data}`);
}
