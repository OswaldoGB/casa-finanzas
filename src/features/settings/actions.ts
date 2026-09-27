"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/features/permissions/queries";
import {
  MODULE_NAMES,
  type PermissionLevel,
} from "@/features/permissions/modules";
import type { FormState } from "@/features/auth/schemas";
import { householdSchema, memberSchema, permissionsSchema } from "./schemas";

export async function updateHousehold(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireAdmin();
  const parsed = householdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { error } = await supabase
    .from("households")
    .update(parsed.data)
    .eq("id", profile.household_id);
  if (error) return { error: "No se pudo actualizar el hogar." };
  revalidatePath("/settings");
  return { ok: "Hogar actualizado." };
}

export async function createMember(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireAdmin();
  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };

  const { data: existing, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("household_id", profile.household_id)
    .eq("role", "member")
    .maybeSingle();
  if (lookupError)
    return { error: "No se pudo verificar los miembros del hogar." };
  if (existing)
    return {
      error: "Este hogar ya tiene un miembro. Solo se permiten dos usuarios.",
    };

  const admin = createAdminClient();
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    });
  if (createError || !created.user)
    return {
      error:
        "No se pudo crear el usuario. Revisa si ese correo ya está registrado.",
    };

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    household_id: profile.household_id,
    full_name: parsed.data.fullName,
    role: "member",
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "No se pudo agregar al miembro. Intenta de nuevo." };
  }
  revalidatePath("/settings");
  return {
    ok: "Miembro creado. Asigna sus permisos abajo y comparte su contraseña de forma privada.",
  };
}

export async function savePermissions(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireAdmin();
  const rawPermissions = Object.fromEntries(
    MODULE_NAMES.map((module) => [module, formData.get(module) ?? "none"]),
  );
  const parsed = permissionsSchema.safeParse({
    userId: formData.get("userId"),
    permissions: rawPermissions,
  });
  if (!parsed.success)
    return { error: "La selección de permisos es inválida." };
  const { data: member, error: memberError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", parsed.data.userId)
    .eq("household_id", profile.household_id)
    .eq("role", "member")
    .maybeSingle();
  if (memberError || !member)
    return { error: "Ese miembro no pertenece a tu hogar." };

  const rows = MODULE_NAMES.map((module) => ({
    user_id: member.id,
    household_id: profile.household_id,
    module,
    level: parsed.data.permissions[module] as PermissionLevel,
    created_by: profile.id,
  }));
  const { error } = await supabase
    .from("module_permissions")
    .upsert(rows, { onConflict: "user_id,module" });
  if (error) return { error: "No se pudieron guardar los permisos." };
  revalidatePath("/", "layout");
  return { ok: "Permisos guardados." };
}
