"use client";
import { MoneyInput } from "@/components/ui/money-input";
import { FormSelect } from "@/components/ui/form-select";
import { fieldClass } from "@/features/shopping-lists/components/forms";
import { saveCostLine } from "../actions";
import type { TripSnapshot } from "../schemas";
import { ActionDialog } from "./action-dialog";
export function CostLineDialog({
  snapshot,
  line,
  activityId,
}: {
  snapshot: TripSnapshot;
  line?: TripSnapshot["costLines"][number];
  activityId?: string;
}) {
  return (
    <ActionDialog
      title={line ? "Editar concepto" : "Presupuestar un costo"}
      action={saveCostLine}
      trigger={
        <button
          type="button"
          className="text-primary hover:bg-accent rounded-lg border px-3 py-2 text-sm"
        >
          {line ? "Editar concepto" : "Añadir costo"}
        </button>
      }
    >
      <input type="hidden" name="project_id" value={snapshot.project.id} />
      {line && <input type="hidden" name="id" value={line.id} />}
      <label className="grid gap-1 text-sm">
        Concepto
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={line?.name}
          placeholder="Airbnb, gasolina, paseo…"
          className={fieldClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          Cantidad
          <input
            type="number"
            name="quantity"
            step="0.001"
            min="0.001"
            max="9999999.999"
            defaultValue={line?.quantity ?? 1}
            className={fieldClass}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Unidad
          <input
            name="unit"
            maxLength={30}
            defaultValue={line?.unit ?? ""}
            placeholder="noche, persona…"
            className={fieldClass}
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        Precio estimado por unidad (USD)
        <MoneyInput
          name="estimated_price"
          min="0"
          step="0.01"
          defaultValue={line?.estimated_price ?? ""}
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Actividad (opcional)
        <FormSelect
          name="activity_id"
          placeholder="General del viaje"
          defaultValue={line?.activity_id ?? activityId ?? ""}
          options={[
            { value: "none", label: "General del viaje" },
            ...snapshot.activities.map((a) => ({
              value: a.id,
              label: `${a.date} · ${a.title}`,
            })),
          ]}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Categoría (opcional)
        <FormSelect
          name="category_id"
          placeholder="Sin categoría prevista"
          defaultValue={line?.category_id ?? ""}
          options={[
            { value: "none", label: "Sin categoría prevista" },
            ...snapshot.options.categories.map((c) => ({
              value: c.id,
              label: c.name,
            })),
          ]}
        />
      </label>
      {line && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="is_settled"
            defaultChecked={line.is_settled}
            className="accent-primary mt-1"
          />
          Este concepto está completado; no quedan pagos previstos.
        </label>
      )}
    </ActionDialog>
  );
}
