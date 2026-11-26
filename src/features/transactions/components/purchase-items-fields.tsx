"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";
import { formatUSD } from "@/lib/format";
import { purchaseTotalCents, type PurchaseItem } from "../purchase-items";

export function PurchaseItemsFields({ initial }: { initial: PurchaseItem[] }) {
  const [items, setItems] = useState(initial);

  function change(id: string, fields: Partial<PurchaseItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...fields } : item)),
    );
  }

  return (
    <fieldset className="grid min-w-0 gap-3 rounded-xl border p-3">
      <legend className="px-1 text-sm font-medium">Ítems de la compra</legend>
      <input
        type="hidden"
        name="purchase_items"
        value={JSON.stringify(items)}
      />
      {items.map((item, index) => (
        <div
          key={item.id}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-2 rounded-lg border p-2"
        >
          <label className="col-span-2 grid gap-1 text-xs">
            Ítem {index + 1}
            <input
              className="border-input bg-background min-w-0 rounded-lg border p-2 text-sm"
              maxLength={120}
              value={item.name}
              onChange={(event) =>
                change(item.id, { name: event.target.value })
              }
            />
          </label>
          <button
            type="button"
            aria-label={`Quitar ítem ${index + 1}`}
            className="hover:bg-accent self-end rounded-lg p-2"
            onClick={() =>
              setItems((current) => current.filter((row) => row.id !== item.id))
            }
          >
            <X className="size-4" />
          </button>
          <label className="grid gap-1 text-xs">
            Cantidad
            <input
              className="border-input bg-background min-w-0 rounded-lg border p-2 text-sm"
              type="number"
              min={1}
              step={1}
              value={item.quantity || ""}
              onChange={(event) =>
                change(item.id, { quantity: Number(event.target.value) })
              }
            />
          </label>
          <label className="grid gap-1 text-xs">
            Precio unitario
            <MoneyInput
              className="border-input bg-background w-full min-w-0 rounded-lg border p-2 text-sm"
              min="0"
              step="0.01"
              defaultValue={item.unitCents / 100}
              onChange={(event) =>
                change(item.id, {
                  unitCents: Math.round(Number(event.target.value) * 100),
                })
              }
            />
          </label>
          <div className="self-center text-right text-xs">
            Total
            <div className="font-semibold tabular-nums">
              {formatUSD(purchaseTotalCents(item) / 100)}
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="hover:bg-accent inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        disabled={items.length >= 100}
        onClick={() =>
          setItems((current) => [
            ...current,
            { id: crypto.randomUUID(), name: "", quantity: 1, unitCents: 0 },
          ])
        }
      >
        <Plus className="size-4" /> Agregar ítems
      </button>
    </fieldset>
  );
}
