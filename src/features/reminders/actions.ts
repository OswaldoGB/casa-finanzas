"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModule } from "@/features/permissions/queries";
import type { FormState } from "@/features/auth/schemas";
import {
  reminderSchema,
  completionSchema,
  categorySchema,
  day,
} from "./schemas";
function refresh() {
  revalidatePath("/reminders");
  revalidatePath("/reminders/[id]", "page");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}
function failure(error: { message: string; code?: string } | null) {
  return {
    error:
      error?.code === "P0001"
        ? error.message
        : "No se pudo guardar. Revisa los datos y vuelve a intentar.",
  };
}
export async function saveReminder(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { profile, supabase } = await requireModule("reminders", "edit");
  const raw = Object.fromEntries(form),
    parsed = reminderSchema.safeParse({
      ...raw,
      alert_days: String(form.get("alert_days") ?? "")
        .split(",")
        .filter(Boolean),
    });
  const key = z.string().uuid().safeParse(form.get("request_key"));
  if (!parsed.success)
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  if (!key.success) return { error: "Actualiza el formulario." };
  const id = z
    .string()
    .uuid()
    .optional()
    .safeParse(form.get("id") || undefined);
  if (!id.success) return { error: "Registro inválido." };
  const payload = {
    ...parsed.data,
    ...(id.data ? { id: id.data } : {}),
    confirm_reading_correction: form.get("confirm_reading_correction") === "on",
  };
  if (id.data) {
    const current = await supabase
      .from("reminders")
      .select("owner_id,visibility")
      .eq("id", id.data)
      .maybeSingle();
    if (current.data?.owner_id !== profile.id)
      payload.visibility = current.data?.visibility ?? "personal";
  }
  const done =
    form.get("already_done") === "on"
      ? completionSchema.safeParse({
          performed_date: form.get("performed_date"),
          performed_km: form.get("performed_km"),
          notes: form.get("performed_notes") ?? "",
        })
      : null;
  if (done && !done.success)
    return { fieldErrors: done.error.flatten().fieldErrors };
  const { error } = await supabase.rpc("save_reminder", {
    p_input: {
      ...payload,
      ...(done?.success
        ? {
            performed_date: done.data.performed_date,
            performed_km: done.data.performed_km,
            performed_notes: done.data.notes,
          }
        : {}),
    },
    p_request_key: key.data,
  });
  if (error) return failure(error);
  refresh();
  return { ok: id.data ? "Recordatorio actualizado." : "Registro guardado." };
}
export async function completeReminder(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("reminders", "edit");
  const p = completionSchema.safeParse(Object.fromEntries(form)),
    ids = z
      .object({
        id: z.string().uuid(),
        occurrence_id: z.string().uuid(),
        request_key: z.string().uuid(),
      })
      .safeParse(Object.fromEntries(form));
  if (!p.success) return { fieldErrors: p.error.flatten().fieldErrors };
  if (!ids.success) return { error: "Actualiza el formulario." };
  const { error } = await supabase.rpc("complete_reminder", {
    p_id: ids.data.id,
    p_occurrence_id: ids.data.occurrence_id,
    p_request_key: ids.data.request_key,
    p_input: {
      ...p.data,
      confirm_reading_correction:
        form.get("confirm_reading_correction") === "on",
    },
  });
  if (error) return failure(error);
  refresh();
  return { ok: "Realización guardada. La próxima ocasión quedó preparada." };
}
export async function operateReminder(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireModule("reminders", "edit");
  const id = z.string().uuid().safeParse(form.get("id")),
    op = z
      .enum(["pause", "resume", "archive", "restore", "snooze"])
      .safeParse(form.get("operation"));
  if (!id.success || !op.success) return { error: "Operación inválida." };
  if (op.data === "snooze" && !day.safeParse(form.get("date")).success)
    return { error: "Elige una fecha válida." };
  const { error } = await supabase.rpc("reminder_operation", {
    p_id: id.data,
    p_operation: op.data,
    p_input: op.data === "snooze" ? { date: String(form.get("date")) } : {},
  });
  if (error) return failure(error);
  refresh();
  return { ok: "Recordatorio actualizado." };
}
export async function saveReminderCategory(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase, profile } = await requireModule("reminders", "edit");
  const p = categorySchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { fieldErrors: p.error.flatten().fieldErrors };
  const id = form.get("id");
  const result =
    typeof id === "string" && z.string().uuid().safeParse(id).success
      ? await supabase
          .from("reminder_categories")
          .update({ ...p.data, is_archived: form.get("is_archived") === "on" })
          .eq("id", id)
          .eq("household_id", profile.household_id)
          .select("id")
      : await supabase
          .from("reminder_categories")
          .insert({ ...p.data, household_id: profile.household_id })
          .select("id");
  if (result.error || !result.data?.length) return failure(result.error);
  refresh();
  return { ok: "Categoría guardada." };
}
