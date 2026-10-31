"use client";

import { useState } from "react";
import { packagingPresets } from "../packages";
import { MoneyInput } from "@/components/ui/money-input";
import { ActionForm } from "@/features/projects/components/action-form";
import { inputClass } from "@/features/projects/schemas";
import { saveInventory } from "../actions";
import type { InventoryItem } from "../queries";
import { formatUSD } from "@/lib/format";

export function InventoryForm({
  item,
  transactions = [],
  onSuccess,
}: {
  item?: InventoryItem;
  onSuccess?: () => void;
  transactions?: {
    id: string;
    date: string;
    description: string;
    amount: number;
  }[];
}) {
  const [mode, setMode] = useState<"simple" | "packages">("simple");
  return (
    <ActionForm action={saveInventory} onSuccess={onSuccess}>
      {!item && <input type="hidden" name="mode" value={mode} />}
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
      {!item && <fieldset className="space-y-3 rounded-xl border p-4"><legend className="px-1 text-sm font-medium">¿Cómo tienes este producto?</legend><div className="grid grid-cols-2 gap-2"><button type="button" aria-pressed={mode === "simple"} onClick={() => setMode("simple")} className={`rounded-xl border p-3 text-left text-sm ${mode === "simple" ? "border-primary bg-primary/10" : ""}`}><strong className="block">Unidades sueltas</strong><span className="text-muted-foreground text-xs">Una cantidad total</span></button><button type="button" aria-pressed={mode === "packages"} onClick={() => setMode("packages")} className={`rounded-xl border p-3 text-left text-sm ${mode === "packages" ? "border-primary bg-primary/10" : ""}`}><strong className="block">En envases</strong><span className="text-muted-foreground text-xs">Bolsas, botellas y más</span></button></div></fieldset>}
      {item || mode === "simple" ? <label className="block space-y-1 text-sm">{item ? "Cantidad inicial registrada" : "Cantidad inicial"}<input readOnly={Boolean(item)} name="quantity" type="number" required min="0.001" step="0.001" defaultValue={item?.quantity ?? 1} className={inputClass}/></label> : <><input type="hidden" name="quantity" value="1"/><div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1 text-sm">Tipo de envase<input name="package_name" list="initial-package-names" required maxLength={60} placeholder="Ej. Bolsa" className={inputClass}/><datalist id="initial-package-names">{packagingPresets.map(name => <option key={name} value={name}/>)}</datalist></label><label className="block space-y-1 text-sm">Contenedor (opcional)<input name="group_name" maxLength={60} placeholder="Ej. Caja" className={inputClass}/></label><label className="block space-y-1 text-sm">Número de envases<input name="package_count" type="number" min="1" max="1000" defaultValue="1" required className={inputClass}/></label><label className="block space-y-1 text-sm">Unidades por envase<input name="package_capacity" type="number" min="1" max="1000000" required className={inputClass}/></label></div><p className="text-muted-foreground text-xs">Por ejemplo: una caja con 4 bolsas de 39 unidades. Podrás abrir cada bolsa y registrar su consumo.</p></>}
      {item && <p className="text-muted-foreground text-xs">Para cambiar las existencias, usa los controles de envases y su historial.</p>}
      <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">Detalles opcionales</summary><div className="mt-4 space-y-4">
      <label className="block space-y-1 text-sm">Precio por unidad ($)<MoneyInput name="purchase_price" type="number" min="0" step="0.01" defaultValue={item?.purchase_price ?? ""} className={inputClass}/></label>
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
      </div></details>
      <p className="text-muted-foreground text-xs">
        Guarda el artículo para agregar una foto. Registrar inventario no crea
        un gasto.
      </p>
    </ActionForm>
  );
}
