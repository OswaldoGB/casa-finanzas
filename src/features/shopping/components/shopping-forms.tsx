import { MoneyInput } from "@/components/ui/money-input";
import { ActionForm } from "@/features/projects/components/action-form";
import { inputClass } from "@/features/projects/schemas";
import { saveShopping, buyShopping } from "../actions";
import { priorityLabels } from "../schemas";
import type { ShoppingItem, getShopping } from "../queries";

export function ShoppingForm({ item }: { item?: ShoppingItem }) {
  return (
    <ActionForm action={saveShopping}>
      {item && <input type="hidden" name="id" value={item.id} />}
      <label className="block space-y-1 text-sm">
        Nombre
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={item?.name}
          className={inputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        Precio estimado ($)
        <MoneyInput
          name="estimated_price"
          type="number"
          min="0"
          step="0.01"
          defaultValue={item?.estimated_price ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        Prioridad
        <select
          name="priority"
          defaultValue={item?.priority ?? "medium"}
          className={inputClass}
        >
          {Object.entries(priorityLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        Fecha objetivo
        <input
          name="target_date"
          type="date"
          defaultValue={item?.target_date ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        Enlace
        <input
          name="url"
          type="url"
          maxLength={2000}
          defaultValue={item?.url ?? ""}
          className={inputClass}
          placeholder="https://…"
        />
      </label>
      <label className="block space-y-1 text-sm">
        Notas
        <textarea
          name="notes"
          maxLength={2000}
          defaultValue={item?.notes ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        Estado
        <select
          name="status"
          defaultValue={item?.status ?? "pending"}
          className={inputClass}
        >
          <option value="pending">Pendiente</option>
          <option value="discarded">Descartado</option>
        </select>
      </label>
    </ActionForm>
  );
}
type Options = Awaited<ReturnType<typeof getShopping>>;
export function BuyForm({
  item,
  options,
}: {
  item: ShoppingItem;
  options: Options;
}) {
  return (
    <ActionForm action={buyShopping} label="Registrar compra y gasto">
      <input type="hidden" name="id" value={item.id} />
      <label className="block space-y-1 text-sm">
        Precio pagado ($, impuesto incluido)
        <MoneyInput
          name="amount"
          type="number"
          required
          min="0.01"
          step="0.01"
          defaultValue={item.estimated_price ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        Fecha
        <input
          name="date"
          type="date"
          required
          defaultValue={options.today}
          className={inputClass}
        />
      </label>
      {(
        [
          ["account_id", "Cuenta", options.accounts],
          ["category_id", "Categoría", options.categories],
          ["payment_method_id", "Método", options.methods],
        ] as const
      ).map(([name, label, items]) => (
        <label key={name} className="block space-y-1 text-sm">
          {label}
          <select
            name={name}
            required={name !== "payment_method_id"}
            className={inputClass}
          >
            <option value="">Seleccionar</option>
            {items.map((option) => (
              <option value={option.id} key={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      ))}
      {options.canInventory ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="create_inventory" /> Agregar también al
          inventario
        </label>
      ) : (
        <p className="text-muted-foreground text-xs">
          Agregar al inventario requiere permiso para editar Inventario.
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        Se crea un solo gasto confirmado. Después puedes adjuntar su recibo
        desde Movimientos.
      </p>
    </ActionForm>
  );
}
