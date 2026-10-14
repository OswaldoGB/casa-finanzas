"use client";
import { useState } from "react";
import { CalendarDays, MapPin, Clock } from "lucide-react";
import { activityKinds, type TripSnapshot } from "../schemas";
import { ActivityDialog } from "./activity-dialog";
import { ActivityItems } from "./activity-items";
import { CostLineDialog } from "./cost-line-dialog";
import { RemoveRecord } from "./action-dialog";
const dayLabel = new Intl.DateTimeFormat("es-SV", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
export function TripDays({ snapshot }: { snapshot: TripSnapshot }) {
  const [storedWeek, setWeek] = useState(0);
  const start = new Date(`${snapshot.project.start_date}T12:00:00Z`).getTime();
  const maxWeek = Math.floor(
    (new Date(`${snapshot.project.end_date}T12:00:00Z`).getTime() - start) /
      86400000 /
      7,
  );
  const week = Math.min(storedWeek, maxWeek);
  const days = Array.from({ length: 7 }, (_, i) =>
    new Date(start + (week * 7 + i) * 86400000).toISOString().slice(0, 10),
  ).filter((d) => d <= snapshot.project.end_date);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Menús, salidas y experiencias, día por día.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            disabled={week === 0}
            onClick={() => setWeek(week - 1)}
            className="rounded-lg border px-3 py-2 text-xs disabled:opacity-30"
          >
            Anterior
          </button>
          <button
            disabled={week >= maxWeek}
            onClick={() => setWeek(week + 1)}
            className="rounded-lg border px-3 py-2 text-xs disabled:opacity-30"
          >
            Siguiente
          </button>
        </div>
      </div>
      {days.map((day) => (
        <section key={day} className="bg-card rounded-2xl border p-4 sm:p-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold capitalize">
              <CalendarDays className="text-primary size-5 shrink-0" />
              {dayLabel.format(new Date(`${day}T12:00:00Z`))}
            </h2>
            {snapshot.canEdit && (
              <ActivityDialog snapshot={snapshot} date={day} />
            )}
          </header>
          <div className="mt-4 space-y-3">
            {!snapshot.activities.some((a) => a.date === day) && (
              <p className="text-muted-foreground rounded-xl border border-dashed p-5 text-center text-sm">
                Un día por planear. Agrega comidas o algo que quieran hacer.
              </p>
            )}
            {snapshot.activities
              .filter((a) => a.date === day)
              .map((a) => (
                <article key={a.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-primary bg-primary/10 rounded-full px-2 py-1 text-xs">
                        {activityKinds[a.kind as keyof typeof activityKinds] ??
                          "Otro"}
                      </span>
                      <h3 className="mt-2 font-semibold break-words">
                        {a.title}
                      </h3>
                      <div className="text-muted-foreground mt-1 flex flex-wrap gap-3 text-xs">
                        {a.time && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" />
                            {a.time.slice(0, 5)}
                          </span>
                        )}
                        {a.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" />
                            {a.location}
                          </span>
                        )}
                      </div>
                    </div>
                    {snapshot.canEdit && (
                      <ActivityDialog
                        snapshot={snapshot}
                        date={day}
                        activity={a}
                      />
                    )}
                  </div>
                  {a.notes && (
                    <p className="text-muted-foreground mt-3 text-sm break-words whitespace-pre-wrap">
                      {a.notes}
                    </p>
                  )}
                  <ActivityItems snapshot={snapshot} activityId={a.id} />
                  {snapshot.canEdit && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <CostLineDialog snapshot={snapshot} activityId={a.id} />
                      <RemoveRecord
                        id={a.id}
                        kind="activity"
                        label="Quitar actividad"
                      />
                    </div>
                  )}
                  {snapshot.costLines.some((c) => c.activity_id === a.id) && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      Costos vinculados:{" "}
                      {snapshot.costLines
                        .filter((c) => c.activity_id === a.id)
                        .map((c) => c.name)
                        .join(", ")}
                      . Consúltalos en Presupuesto.
                    </p>
                  )}
                </article>
              ))}
          </div>
        </section>
      ))}
    </section>
  );
}
