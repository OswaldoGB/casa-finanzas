import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import { todayInTimeZone } from "@/features/recurring/processing";
import { reminderFilters, type ReminderFilters } from "./filters";
import type { ReminderRecord, ReminderEvent } from "./types";
export async function getReminderOptions() {
  const access = await requireModule("reminders");
  const [categories, home] = await Promise.all([
    access.supabase
      .from("reminder_categories")
      .select("*")
      .eq("household_id", access.profile.household_id)
      .order("name"),
    access.supabase
      .from("households")
      .select("timezone")
      .eq("id", access.profile.household_id)
      .single(),
  ]);
  if (categories.error || home.error)
    throw new Error("No se pudieron cargar las opciones.");
  return {
    ...access,
    categories: categories.data ?? [],
    today: todayInTimeZone(new Date(), home.data.timezone),
    canEdit: canAccess(
      access.profile.role,
      access.permissions,
      "reminders",
      "edit",
    ),
  };
}
export async function getReminders(input: Partial<ReminderFilters>) {
  const options = await getReminderOptions(),
    filters = reminderFilters.parse(input);
  let query = options.supabase
    .from("reminders")
    .select("*", { count: "exact" })
    .eq("household_id", options.profile.household_id);
  if (filters.view === "notes")
    query = query.eq("kind", "note").neq("status", "archived");
  else if (
    filters.view === "completed" ||
    filters.view === "paused" ||
    filters.view === "archived"
  )
    query = query.eq("status", filters.view);
  else query = query.eq("status", "active").neq("kind", "note");
  if (filters.category) query = query.eq("category_id", filters.category);
  if (filters.reference) query = query.eq("reference", filters.reference);
  if (filters.privacy) query = query.eq("visibility", filters.privacy);
  if (filters.q) {
    const term = JSON.stringify(`%${filters.q.replace(/[%_\\]/g, "")}%`);
    query = query.or(`title.ilike.${term},reference.ilike.${term}`);
  }
  if (filters.view === "calendar") {
    const month = filters.month ?? options.today.slice(0, 7);
    const end = new Date(`${month}-01T00:00:00Z`);
    end.setUTCMonth(end.getUTCMonth() + 1);
    query = query
      .gte("effective_date", `${month}-01`)
      .lt("effective_date", end.toISOString().slice(0, 10));
  }
  if (filters.date) query = query.eq("effective_date", filters.date);
  const result = await query
    .order("effective_date", { ascending: true, nullsFirst: false })
    .order("due_time", { ascending: true, nullsFirst: false })
    .order("id")
    .range((filters.page - 1) * 50, filters.page * 50 - 1);
  if (result.error) throw new Error("No se pudieron cargar los recordatorios.");
  return {
    records: result.data ?? [],
    count: result.count ?? 0,
    filters,
    categories: options.categories,
    today: options.today,
    canEdit: options.canEdit,
    userId: options.profile.id,
  };
}
export async function getReminder(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const options = await getReminderOptions();
  const result = await options.supabase.rpc("reminder_snapshot", { p_id: id });
  if (result.error) throw new Error("No se pudo cargar el recordatorio.");
  if (!result.data) return null;
  return {
    ...(result.data as unknown as {
      reminder: ReminderRecord;
      events: ReminderEvent[];
    }),
    categories: options.categories,
    today: options.today,
    canEdit: options.canEdit,
    userId: options.profile.id,
  };
}
