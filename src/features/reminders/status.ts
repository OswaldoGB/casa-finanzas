import type { ReminderSchedule } from "./schedule";
export function reminderStatus(
  r: ReminderSchedule & { kind: string },
  today: string,
) {
  if (r.status !== "active")
    return r.status as "paused" | "completed" | "archived";
  if (r.kind === "note") return "note";
  const date = r.snoozedUntil ?? r.dueDate;
  if (r.dueKm != null && r.currentKm != null && r.currentKm >= r.dueKm)
    return "overdue";
  if (date && date < today) return "overdue";
  if (date === today) return "today";
  if (date) return "upcoming";
  return r.currentKm == null ? "mileage_unknown" : "upcoming";
}
