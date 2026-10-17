import type { ReminderEvent } from "../types";
const labels: Record<string, string> = {
  completed: "Realizado",
  snoozed: "Pospuesto",
  paused: "Pausado",
  resumed: "Reanudado",
  archived: "Archivado",
  restored: "Restaurado",
  reading_corrected: "Lectura corregida",
};
export function ReminderHistory({ events }: { events: ReminderEvent[] }) {
  return (
    <section className="bg-card rounded-2xl border p-5">
      <h2 className="font-semibold">Historial</h2>
      {!events.length ? (
        <p className="text-muted-foreground mt-3 text-sm">
          Aquí aparecerán las realizaciones y los cambios importantes.
        </p>
      ) : (
        <ol className="mt-4 divide-y">
          {events.map((e) => (
            <li key={e.id} className="space-y-2 py-4">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <strong>{labels[e.kind] ?? e.kind}</strong>
                <span className="text-muted-foreground">
                  {e.performed_date ?? e.created_at.slice(0, 10)}
                </span>
              </div>
              {e.performed_km != null && (
                <p className="text-sm">
                  {e.performed_km.toLocaleString("es")} km
                </p>
              )}
              {e.notes && (
                <p className="text-sm break-words whitespace-pre-wrap">
                  {e.notes}
                </p>
              )}
              {e.skipped_count > 0 && (
                <p className="text-muted-foreground text-xs">
                  Se omitieron {e.skipped_count} períodos vencidos del
                  calendario. No se registraron como realizados.
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
