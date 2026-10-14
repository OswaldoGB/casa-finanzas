"use client";
import { MoneyInput } from "@/components/ui/money-input";
import { FormSelect } from "@/components/ui/form-select";
import { fieldClass } from "@/features/shopping-lists/components/forms";
import { projectStatus } from "@/features/projects/schemas";
import type { TripData } from "../schemas";
export function TripForm({
  trip,
}: {
  trip?: Pick<TripData, "project" | "detail">;
}) {
  return (
    <>
      {trip && <input type="hidden" name="id" value={trip.project.id} />}
      <label className="grid gap-1 text-sm">
        Nombre del viaje
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={trip?.project.name}
          placeholder="Escapada a la playa"
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Destino
        <input
          name="destination"
          maxLength={200}
          defaultValue={trip?.detail.destination}
          placeholder="Costa del Sol"
          className={fieldClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          Inicio
          <input
            name="start_date"
            type="date"
            required
            defaultValue={trip?.project.start_date}
            className={fieldClass}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Final
          <input
            name="end_date"
            type="date"
            required
            defaultValue={trip?.project.end_date}
            className={fieldClass}
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        Presupuesto máximo (USD)
        <MoneyInput
          name="budget"
          min="0"
          step="0.01"
          defaultValue={trip?.project.budget ?? 0}
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Quiénes van
        <input
          name="participants"
          maxLength={500}
          defaultValue={trip?.detail.participants}
          placeholder="Nosotros dos"
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Estado
        <FormSelect
          name="status"
          defaultValue={trip?.project.status ?? "planned"}
          placeholder="Estado"
          options={Object.entries(projectStatus).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Notas
        <textarea
          name="description"
          maxLength={2000}
          rows={3}
          defaultValue={trip?.project.description}
          className="bg-background rounded-lg border p-3"
        />
      </label>
    </>
  );
}
