"use client";

import { useState, useTransition } from "react";
import { formatUSD } from "@/lib/format";
import { findLoanPurchases } from "../actions";

type Purchase = Awaited<ReturnType<typeof findLoanPurchases>>[number];
type Selection = {
  purchase_id: string;
  item_id: string;
  quantity: number;
  unitCents: number;
};

export function LoanPurchasePicker() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Purchase[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selection, setSelection] = useState<Selection[]>([]);
  const [feedback, setFeedback] = useState("");
  const [pending, start] = useTransition();
  const total = selection.reduce(
    (sum, item) => sum + item.quantity * item.unitCents,
    0,
  );

  function search() {
    start(async () => {
      try {
        const rows = await findLoanPurchases(query);
        setResults(rows);
        setFeedback(
          rows.length ? "" : "No se encontraron compras con ítems disponibles.",
        );
      } catch {
        setFeedback("No se pudieron cargar las compras.");
      }
    });
  }

  return (
    <fieldset className="grid min-w-0 gap-3 rounded-xl border p-3">
      <legend className="px-1 text-sm font-medium">Compras vinculadas</legend>
      <input
        type="hidden"
        name="selected_purchases"
        value={JSON.stringify(selection)}
      />
      <label className="grid gap-1 text-sm">
        Buscar por descripción o lugar
        <input
          className="border-input bg-background w-full rounded-lg border px-3 py-2"
          value={query}
          maxLength={120}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              search();
            }
          }}
        />
      </label>
      <button
        type="button"
        onClick={search}
        disabled={pending}
        className="hover:bg-accent rounded-lg border px-3 py-2 text-sm"
      >
        {pending ? "Buscando…" : "Buscar compras"}
      </button>
      {feedback && (
        <p role="status" className="text-muted-foreground text-sm">
          {feedback}
        </p>
      )}
      <div className="max-h-44 space-y-1 overflow-y-auto">
        {results
          .filter(
            (row) => !purchases.some((purchase) => purchase.id === row.id),
          )
          .map((row) => (
            <button
              key={row.id}
              type="button"
              className="hover:bg-accent block w-full rounded-lg border p-2 text-left text-sm"
              onClick={() => setPurchases((current) => [...current, row])}
            >
              {row.description || row.purchase_place || "Compra"} · {row.date} ·{" "}
              {formatUSD(row.amount)}
            </button>
          ))}
      </div>
      {purchases.map((purchase) => (
        <div key={purchase.id} className="grid gap-2 rounded-lg border p-2">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">
              {purchase.description || purchase.purchase_place || "Compra"}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:underline"
              onClick={() => {
                setPurchases((current) =>
                  current.filter((row) => row.id !== purchase.id),
                );
                setSelection((current) =>
                  current.filter((row) => row.purchase_id !== purchase.id),
                );
              }}
            >
              Quitar
            </button>
          </div>
          {purchase.items.map((item) => (
            <label
              key={item.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="min-w-0 break-words">
                {item.name}
                <span className="text-muted-foreground block text-xs">
                  {item.quantity} disponibles ·{" "}
                  {formatUSD(item.unitCents / 100)} c/u
                </span>
              </span>
              <input
                aria-label={`Unidades de ${item.name}`}
                type="number"
                min={0}
                max={item.quantity}
                step={1}
                defaultValue={0}
                className="border-input bg-background w-20 rounded-lg border px-2 py-1"
                onChange={(event) => {
                  const quantity = Number(event.target.value);
                  setSelection((current) => {
                    const rest = current.filter(
                      (row) =>
                        row.purchase_id !== purchase.id ||
                        row.item_id !== item.id,
                    );
                    return quantity > 0
                      ? [
                          ...rest,
                          {
                            purchase_id: purchase.id,
                            item_id: item.id,
                            quantity,
                            unitCents: item.unitCents,
                          },
                        ]
                      : rest;
                  });
                }}
              />
            </label>
          ))}
        </div>
      ))}
      <p className="text-sm font-semibold">
        Total del préstamo · {formatUSD(total / 100)}
      </p>
    </fieldset>
  );
}
