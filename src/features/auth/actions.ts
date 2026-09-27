"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasAnyProfile } from "./queries";
import { forgotSchema, loginSchema, resetSchema, safeNext, setupSchema, type FormState } from "./schemas";

const fields = (fd: FormData) => Object.fromEntries(fd);

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(fields(fd));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Correo o contraseña incorrectos." };
  redirect(safeNext(fd.get("next")));
}

export async function requestPasswordReset(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = forgotSchema.safeParse(fields(fd));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${site}/auth/confirm?next=/reset-password`,
  });
  // Misma respuesta exista o no el correo.
  return { ok: "Si el correo está registrado, te enviamos un enlace para restablecer la contraseña." };
}

export async function updatePassword(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(fields(fd));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "No se pudo actualizar la contraseña. Pide un enlace nuevo." };
  redirect("/dashboard");
}

export async function setupHousehold(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = setupSchema.safeParse(fields(fd));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  if (await hasAnyProfile()) return { error: "La app ya fue configurada. Inicia sesión." };

  const { fullName, householdName, email, password, timezone } = parsed.data;
  const admin = createAdminClient();

  const { data: created, error: userErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (userErr || !created.user) return { error: `No se pudo crear el usuario: ${userErr?.message ?? "desconocido"}` };
  const userId = created.user.id;

  const { data: household, error: hhErr } = await admin
    .from("households")
    .insert({ name: householdName, timezone })
    .select("id")
    .single();
  const { error: profErr } = household
    ? await admin.from("profiles").insert({ id: userId, household_id: household.id, full_name: fullName, role: "admin" })
    : { error: hhErr };

  if (hhErr || profErr) {
    // Deshacer para poder reintentar /setup (el índice único de admin cubre carreras).
    await admin.auth.admin.deleteUser(userId);
    if (household) await admin.from("households").delete().eq("id", household.id);
    return { error: "No se pudo completar la configuración. Intenta de nuevo." };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
