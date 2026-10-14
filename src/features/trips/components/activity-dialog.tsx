"use client";
import { Plus, Pencil } from "lucide-react";
import { FormSelect } from "@/components/ui/form-select";
import { fieldClass } from "@/features/shopping-lists/components/forms";
import { activityKinds, type TripSnapshot } from "../schemas";
import { saveActivity } from "../actions";
import { ActionDialog } from "./action-dialog";
export function ActivityDialog({
  snapshot,
  date,
  activity,
}: {
  snapshot: TripSnapshot;
  date: string;
  activity?: TripSnapshot["activities"][number];
}) {
  return (
    <ActionDialog
      title={activity ? "Editar actividad" : "Planear actividad"}
      action={saveActivity}
      trigger={
        <button
          type="button"
          aria-label={
            activity
              ? `Editar ${activity.title}`
              : `Agregar actividad para ${date}`
          }
          className="text-primary hover:bg-accent inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          {activity ? (
            <Pencil className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {activity ? "Editar" : "Agregar actividad"}
        </button>
      }
    >
      <input type="hidden" name="project_id" value={snapshot.project.id} />
      {activity && <input type="hidden" name="id" value={activity.id} />}
      <label className="grid gap-1 text-sm">
        Qué planean
        <input
          name="title"
          required
          maxLength={100}
          defaultValue={activity?.title}
          placeholder="Pancakes, paseo en lancha…"
          className={fieldClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          Día
          <input
            name="date"
            type="date"
            required
            min={snapshot.project.start_date}
            max={snapshot.project.end_date}
            defaultValue={activity?.date ?? date}
            className={fieldClass}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Hora (opcional)
          <input
            name="time"
            type="time"
            defaultValue={activity?.time?.slice(0, 5) ?? ""}
            className={fieldClass}
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        Tipo
        <FormSelect
          name="kind"
          defaultValue={activity?.kind ?? "breakfast"}
          placeholder="Tipo de actividad"
          options={Object.entries(activityKinds).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Lugar
        <input
          name="location"
          maxLength={200}
          defaultValue={activity?.location ?? ""}
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Notas
        <textarea
          name="notes"
          maxLength={2000}
          rows={3}
          defaultValue={activity?.notes ?? ""}
          className="bg-background rounded-lg border p-3"
        />
      </label>
      <p className="text-muted-foreground text-xs">
        Puede ser una actividad gratuita. Los productos y costos se vinculan
        después.
      </p>
    </ActionDialog>
  );
}
