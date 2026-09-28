import { ActionForm } from "@/features/projects/components/action-form";
import { inputClass } from "@/features/projects/schemas";
import { saveInventory } from "../actions";
import type { InventoryItem } from "../queries";
import { formatUSD } from "@/lib/format";

export function InventoryForm({
  item,
  transactions = [],
}: {
  item?: InventoryItem;
  transactions?: {
    id: string;
    date: string;
    description: string;
    amount: number;
  }[];
}) {
  return (
    <ActionForm action={saveInventory}>
      {item && <input type="hidden" name="id" value={item.id} />}
      <label className="block space-y-1 text-sm">
        Nombre
        <input
          name="name"
          maxLength={100}
          required
          defaultValue={item?.name}
          className={inputClass}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          Ubicación / habitación
          <input
            name="location"
            maxLength={100}
            defaultValue={item?.location}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1 text-sm">
          Categoría
          <input
            name="category"
            maxLength={100}
            defaultValue={item?.category}
            className={inputClass}
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          Cantidad
          <input
            name="quantity"
            type="number"
            required
            min="0.001"
            step="0.001"
            defaultValue={item?.quantity ?? 1}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1 text-sm">
          Precio por unidad ($)
          <input
            name="purchase_price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={item?.purchase_price ?? ""}
            className={inputClass}
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          Fecha de compra
          <input
            name="purchase_date"
            type="date"
            defaultValue={item?.purchase_date ?? ""}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1 text-sm">
          Garantía hasta
          <input
            name="warranty_until"
            type="date"
            defaultValue={item?.warranty_until ?? ""}
            className={inputClass}
          />
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        Estado
        <select
          name="condition"
          defaultValue={item?.condition ?? "good"}
          className={inputClass}
        >
          {[
            ["new", "Nuevo"],
            ["good", "Bueno"],
            ["worn", "Con desgaste"],
            ["repair", "Necesita reparación"],
            ["retired", "Fuera de uso"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        Notas
        <textarea
          name="notes"
          maxLength={2000}
          defaultValue={item?.notes}
          className={inputClass}
        />
      </label>
      {transactions.length ? (
        <label className="block space-y-1 text-sm">
          Gasto vinculado (opcional)
          <select
            name="transaction_id"
            defaultValue={item?.transaction_id ?? ""}
            className={inputClass}
          >
            <option value="">Sin vincular</option>
            {item?.transaction_id &&
              !transactions.some((row) => row.id === item.transaction_id) && (
                <option value={item.transaction_id}>
                  Gasto vinculado anteriormente
                </option>
              )}
            {transactions.map((row) => (
              <option value={row.id} key={row.id}>
                {row.date} · {row.description || "Gasto"} ·{" "}
                {formatUSD(row.amount)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input
          type="hidden"
          name="transaction_id"
          value={item?.transaction_id ?? ""}
        />
      )}
      <p className="text-muted-foreground text-xs">
        Guarda el artículo para agregar una foto. Registrar inventario no crea
        un gasto.
      </p>
    </ActionForm>
  );
}
