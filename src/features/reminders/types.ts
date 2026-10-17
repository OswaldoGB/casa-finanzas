import type { ReminderInput } from "./schemas";
import type { ReminderSchedule } from "./schedule";
import type { Json } from "@/lib/supabase/database.generated";
export type ReminderRecord = ReminderInput & {
  effective_date: string | null;
  id: string;
  household_id: string;
  owner_id: string;
  status: "active" | "completed" | "paused" | "archived";
  previous_status: string | null;
  anchor_date: string | null;
  snoozed_until: string | null;
  occurrence_id: string;
  schedule_revision: number;
  create_key: string;
  create_payload: Json;
  created_at: string;
  updated_at: string;
};
export type ReminderCategory = {
  id: string;
  household_id: string;
  name: string;
  slug: string | null;
  color: string;
  icon: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};
export type ReminderEvent = {
  id: string;
  household_id: string;
  reminder_id: string;
  created_by: string;
  kind: string;
  occurrence_id: string;
  performed_date: string | null;
  performed_km: number | null;
  notes: string;
  skipped_count: number;
  snapshot: Json;
  result: Json | null;
  request_key: string | null;
  request_payload: Json | null;
  created_at: string;
};
export function scheduleOf(r: ReminderRecord): ReminderSchedule {
  return {
    dueDate: r.due_date,
    dueTime: r.due_time,
    anchorDate: r.anchor_date,
    repeatUnit: r.repeat_unit,
    repeatInterval: r.repeat_interval,
    repeatFrom: r.repeat_from,
    dueKm: r.due_km,
    currentKm: r.current_km,
    repeatKm: r.repeat_km,
    snoozedUntil: r.snoozed_until,
    status: r.status,
  };
}
export const statusLabels: Record<string, string> = {
  note: "Nota",
  overdue: "Vencido",
  today: "Hoy",
  upcoming: "Próximo",
  mileage_unknown: "Kilometraje por actualizar",
  completed: "Realizado",
  paused: "Pausado",
  archived: "Archivado",
};
