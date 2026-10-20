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

const DAY = 86_400_000;
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);

/** "Vence hoy", "Mañana", "En 3 días", "Venció hace 2 días"; null si no tiene fecha. */
export function dueLabel(date: string | null, today: string): string | null {
  if (!date) return null;
  const d = daysBetween(today, date);
  if (d === 0) return "Vence hoy";
  if (d === 1) return "Mañana";
  if (d === -1) return "Venció ayer";
  return d > 0 ? `En ${d} días` : `Venció hace ${-d} días`;
}

export type AgendaBucket = "overdue" | "today" | "week" | "later" | "undated";

/** Sección de la agenda: vencidos, hoy, próximos 7 días, más adelante o sin fecha. */
export function agendaBucket(status: string, date: string | null, today: string): AgendaBucket {
  if (status === "overdue") return "overdue";
  if (status === "today") return "today";
  if (!date) return "undated";
  return daysBetween(today, date) <= 7 ? "week" : "later";
}
