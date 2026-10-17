"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModule } from "@/features/permissions/queries";
import type { FormState } from "@/features/auth/schemas";
export async function refreshMyNotices() {
  const { supabase } = await requireModule("reminders");
  const { error } = await supabase.rpc("refresh_my_reminder_notifications", {});
  if (error) return { error: "No se pudieron actualizar los avisos." };
  revalidatePath("/notifications");
  return { ok: true };
}
export async function markNoticesRead(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("reminders");
  const id = z
    .string()
    .uuid()
    .nullable()
    .safeParse(form.get("id") || null);
  if (!id.success) return { error: "Aviso inválido." };
  const { error } = await supabase.rpc("mark_notifications_read", {
    p_id: id.data,
  });
  if (error) return { error: "No se pudo actualizar el aviso." };
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { ok: "Bandeja actualizada." };
}
export async function saveNotificationPreferences(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("reminders");
  const { error } = await supabase.rpc("set_reminder_preferences", {
    p_shared: form.get("shared_enabled") === "on",
    p_push: form.get("push_enabled") === "on",
  });
  if (error) return { error: "No se guardaron las preferencias." };
  revalidatePath("/notifications");
  return { ok: "Preferencias guardadas." };
}
