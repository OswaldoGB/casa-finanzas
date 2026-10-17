import type { ExportRow } from "./format";
export function reminderExportRows(
  rows: Record<string, unknown>[],
): ExportRow[] {
  return rows.map((r) => ({
    ID: String(r.id ?? ""),
    Título: String(r.title ?? ""),
    Tipo: String(r.kind ?? ""),
    Estado: String(r.status ?? ""),
    Privacidad: r.visibility === "personal" ? "Personal" : "Hogar",
    Referencia: String(r.reference ?? ""),
    Categoría: String(r.category_id ?? ""),
    Fecha: String(r.effective_date ?? r.due_date ?? ""),
    Hora: String(r.due_time ?? ""),
    "Kilometraje actual": (r.current_km as number) ?? null,
    "Kilometraje objetivo": (r.due_km as number) ?? null,
    "Repetir cada": (r.repeat_interval as number) ?? null,
    "Unidad de repetición": String(r.repeat_unit ?? ""),
    "Repetir desde": String(r.repeat_from ?? ""),
    Notas: String(r.notes ?? ""),
  }));
}
export function reminderEventExportRows(
  rows: Record<string, unknown>[],
): ExportRow[] {
  return rows.map((r) => ({
    ID: String(r.id ?? ""),
    Registro: String(r.reminder_id ?? ""),
    Evento: String(r.kind ?? ""),
    Fecha: String(r.performed_date ?? r.created_at ?? ""),
    Kilometraje: (r.performed_km as number) ?? null,
    Observaciones: String(r.notes ?? ""),
    "Períodos omitidos": (r.skipped_count as number) ?? 0,
  }));
}
