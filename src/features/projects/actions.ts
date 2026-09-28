"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/features/permissions/queries";
import type { FormState } from "@/features/auth/schemas";
import { projectSchema } from "./schemas";

export async function saveProject(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("projects", "edit");
  const parsed = projectSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const id = String(form.get("id") ?? "");
  if (id && !z.string().uuid().safeParse(id).success)
    return { error: "Proyecto inválido." };
  const result = id
    ? await supabase
        .from("projects")
        .update(parsed.data)
        .eq("id", id)
        .eq("household_id", profile.household_id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("projects")
        .insert({
          ...parsed.data,
          household_id: profile.household_id,
          created_by: profile.id,
        })
        .select("id")
        .single();
  if (result.error || !result.data)
    return { error: "No se pudo guardar el proyecto." };
  revalidatePath("/projects");
  revalidatePath(`/projects/${result.data.id}`);
  revalidatePath("/reports");
  return { ok: "Proyecto guardado." };
}

export async function deleteProject(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("projects", "edit");
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Proyecto inválido." };
  const result = await supabase
    .from("projects")
    .delete()
    .eq("id", id.data)
    .eq("household_id", profile.household_id)
    .select("id")
    .maybeSingle();
  if (result.error || !result.data)
    return {
      error:
        "No se pudo eliminar. Puedes archivarlo para conservar sus movimientos.",
    };
  revalidatePath("/projects");
  return { ok: "Proyecto eliminado." };
}
