import "server-only";
import { requireModule } from "@/features/permissions/queries";
export async function getNotifications(page = 1) {
  const { supabase, profile } = await requireModule("reminders");
  const [result, preferences, count] = await Promise.all([
    supabase
      .from("user_notifications")
      .select("*", { count: "exact" })
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .order("id")
      .range((page - 1) * 30, page * 30 - 1),
    supabase
      .from("reminder_preferences")
      .select("*")
      .eq("user_id", profile.id)
      .maybeSingle(),
    supabase
      .from("user_notifications")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", profile.id)
      .is("read_at", null),
  ]);
  if (result.error || preferences.error || count.error)
    throw new Error("No se pudo cargar la bandeja.");
  const ids = [...new Set((result.data ?? []).map((n) => n.reminder_id))],
    records = ids.length
      ? await supabase
          .from("reminders")
          .select("id,title,effective_date,reference")
          .in("id", ids)
      : null;
  if (records?.error)
    throw new Error("No se pudieron cargar los recordatorios.");
  return {
    notifications: result.data ?? [],
    records: records?.data ?? [],
    preferences: preferences.data,
    count: result.count ?? 0,
    unread: count.count ?? 0,
  };
}
