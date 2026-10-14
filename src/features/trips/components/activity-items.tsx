"use client";
import { useState } from "react";
import { FormSelect } from "@/components/ui/form-select";
import { MoneyInput } from "@/components/ui/money-input";
import { fieldClass } from "@/features/shopping-lists/components/forms";
import { linkActivityItem } from "../actions";
import type { TripSnapshot } from "../schemas";
import { ActionDialog, RemoveRecord } from "./action-dialog";

export function ActivityItems({
  snapshot,
  activityId,
}: {
  snapshot: TripSnapshot;
  activityId: string;
}) {
  const links = snapshot.activityItems.filter(
    (l) => l.activity_id === activityId,
  );
  return (
    <div className="mt-3 space-y-2">
      {links.map((link) => {
        const item = snapshot.items.find((i) => i.id === link.item_id);
        if (!item) return null;
        const required = snapshot.activityItems
          .filter((l) => l.item_id === item.id)
          .reduce((sum, l) => sum + l.required_quantity, 0);
        return (
          <div key={link.id} className="bg-muted/40 rounded-lg p-3 text-sm">
            <p>
              {item.name} · {link.required_quantity} {link.unit || "unidades"}
            </p>
            <p className="text-muted-foreground text-xs">
              Necesario en el viaje: {required} {link.unit} · Lista:{" "}
              {item.quantity} {item.unit}
              {item.purchase_id
                ? " · Comprado"
                : item.resolution === "available"
                  ? " · Ya lo tenemos"
                  : ""}
            </p>
            {required > item.quantity && (
              <p className="mt-1 text-xs text-amber-500">
                Falta cubrir{" "}
                {Math.round((required - item.quantity) * 1000) / 1000}{" "}
                {item.unit}; ajusta una línea pendiente o agrega otra compra.
              </p>
            )}
            {snapshot.canEdit && snapshot.canEditLists && (
              <div className="mt-2 flex flex-wrap gap-2">
                <IngredientDialog
                  snapshot={snapshot}
                  activityId={activityId}
                  link={link}
                />
                <RemoveRecord
                  id={link.id}
                  kind="ingredient"
                  label="Desvincular producto"
                />
              </div>
            )}
          </div>
        );
      })}
      {snapshot.canEdit && snapshot.canEditLists && (
        <IngredientDialog snapshot={snapshot} activityId={activityId} />
      )}
    </div>
  );
}
function IngredientDialog({
  snapshot,
  activityId,
  link,
}: {
  snapshot: TripSnapshot;
  activityId: string;
  link?: TripSnapshot["activityItems"][number];
}) {
  return (
    <ActionDialog
      title="Productos de esta actividad"
      action={linkActivityItem}
      trigger={
        <button
          type="button"
          className="text-primary rounded-lg border px-3 py-2 text-xs"
        >
          {link ? "Editar cantidad requerida" : "Añadir producto"}
        </button>
      }
    >
      <IngredientFields
        snapshot={snapshot}
        activityId={activityId}
        link={link}
      />
    </ActionDialog>
  );
}
function IngredientFields({
  snapshot,
  activityId,
  link,
}: {
  snapshot: TripSnapshot;
  activityId: string;
  link?: TripSnapshot["activityItems"][number];
}) {
  const [selected, setSelected] = useState(link?.item_id ?? "new");
  const item = snapshot.items.find((i) => i.id === selected);
  return (
    <>
      <input type="hidden" name="activity_id" value={activityId} />
      <input type="hidden" name="item_id" value={item?.id ?? ""} />
      <label className="grid gap-1 text-sm">
        Producto
        <FormSelect
          name="product_choice"
          value={selected}
          onValueChange={setSelected}
          placeholder="Seleccionar producto"
          options={[
            { value: "new", label: "Crear producto nuevo" },
            ...snapshot.items
              .filter(
                (i) =>
                  i.resolution !== "discarded" &&
                  i.resolution !== "legacy_unbought",
              )
              .map((i) => ({
                value: i.id,
                label: `${i.name} · ${i.quantity} ${i.unit}${i.purchase_id ? " · comprado" : ""}`,
              })),
          ]}
        />
      </label>
      {item ? (
        <>
          <input type="hidden" name="name" value={item.name} />
          <input type="hidden" name="estimated_price" value="" />
          <input type="hidden" name="unit" value={item.unit} />
          <p className="text-muted-foreground text-sm">
            Unidad: {item.unit || "unidades"}. El producto se comparte entre
            actividades; no se copia.
          </p>
        </>
      ) : (
        <>
          <label className="grid gap-1 text-sm">
            Nombre
            <input
              name="name"
              required
              maxLength={100}
              placeholder="Leche, huevos…"
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Unidad
            <input
              name="unit"
              maxLength={30}
              placeholder="litro, paquete…"
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Precio estimado por unidad (USD)
            <MoneyInput
              name="estimated_price"
              step="0.01"
              min="0"
              className={fieldClass}
            />
          </label>
        </>
      )}
      <label className="grid gap-1 text-sm">
        Cantidad necesaria para esta actividad
        <input
          name="quantity"
          type="number"
          step="0.001"
          min="0.001"
          max="9999999.999"
          defaultValue={link?.required_quantity ?? 1}
          className={fieldClass}
        />
      </label>
      {item && !item.purchase_id && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="adjust_purchase"
            className="accent-primary mt-1"
          />
          Actualizar la cantidad de la lista con la suma de lo requerido para
          todas las actividades.
        </label>
      )}
      <p className="text-muted-foreground text-xs">
        La lista puede tener más cantidad por paquetes. Las compras pagadas no
        se modifican.
      </p>
    </>
  );
}
