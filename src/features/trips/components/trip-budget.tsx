"use client";
import Link from "next/link";
import { formatUSD } from "@/lib/format";
import type { TripSnapshot } from "../schemas";
import { tripCostBreakdown } from "../totals";
import { CostLineDialog } from "./cost-line-dialog";
import { ExpenseDialog, ExistingExpenseDialog } from "./expense-dialog";
import { RemoveRecord } from "./action-dialog";
export function TripBudget({ snapshot }: { snapshot: TripSnapshot }) {
  const assigned = new Set([
    ...snapshot.costTransactions.map((l) => l.transaction_id),
    ...snapshot.purchases.map((p) => p.transaction_id),
  ]);
  const unassigned = snapshot.transactions.filter((t) => !assigned.has(t.id));
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Presupuesto del viaje</h2>
          <p className="text-muted-foreground text-sm">
            Los productos ya cuentan desde sus listas. Agrega aquí alojamiento,
            transporte y otros costos.
          </p>
        </div>
        {snapshot.canEdit && <CostLineDialog snapshot={snapshot} />}
      </div>
      {snapshot.costLines.map((line) => {
        const totals = tripCostBreakdown(
          line,
          snapshot.costTransactions,
          snapshot.transactions,
        );
        return (
          <article key={line.id} className="bg-card rounded-2xl border p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold break-words">{line.name}</h3>
                <p className="text-muted-foreground text-xs">
                  {line.quantity} {line.unit} ·{" "}
                  {line.activity_id
                    ? snapshot.activities.find((a) => a.id === line.activity_id)
                        ?.title
                    : "General del viaje"}
                </p>
              </div>
              <span
                className={
                  line.is_settled
                    ? "text-income bg-income/10 rounded-full px-3 py-1 text-xs"
                    : "text-primary bg-primary/10 rounded-full px-3 py-1 text-xs"
                }
              >
                {line.is_settled
                  ? "Completado"
                  : totals.real != null
                    ? "Pago parcial"
                    : "Planeado"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Estimado", totals.estimated],
                ["Real", totals.real],
                ["Previsto pendiente", totals.pending],
                ["Diferencia", totals.difference],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p
                    className={`mt-1 font-semibold tabular-nums ${label === "Diferencia" && typeof value === "number" ? (value < 0 ? "text-destructive" : "text-income") : ""}`}
                  >
                    {value == null ? "Pendiente" : formatUSD(Number(value))}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1">
              {snapshot.costTransactions
                .filter((c) => c.cost_line_id === line.id)
                .map((c) => {
                  const tx = snapshot.transactions.find(
                    (t) => t.id === c.transaction_id,
                  );
                  return tx ? (
                    <p key={c.id} className="text-muted-foreground text-xs">
                      {tx.date} · {formatUSD(tx.amount)}{" "}
                      {snapshot.canViewTransactions && (
                        <Link
                          href={`/transactions/${tx.id}`}
                          className="text-primary underline"
                        >
                          Ver movimiento y recibo
                        </Link>
                      )}
                    </p>
                  ) : null;
                })}
            </div>
            {snapshot.canEdit && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <CostLineDialog snapshot={snapshot} line={line} />
                {snapshot.canEditTransactions && (
                  <>
                    <ExpenseDialog snapshot={snapshot} line={line} />
                    <ExistingExpenseDialog snapshot={snapshot} line={line} />
                  </>
                )}
                <RemoveRecord
                  id={line.id}
                  kind="cost"
                  label="Quitar concepto"
                />
              </div>
            )}
          </article>
        );
      })}
      <section className="bg-card rounded-2xl border p-5">
        <h3 className="font-semibold">Productos de las listas</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Estimado: {formatUSD(snapshot.shoppingSummary.estimated)} · Previsto
          pendiente: {formatUSD(snapshot.shoppingSummary.pending)}
        </p>
        {snapshot.items
          .filter((i) => i.resolution === "pending")
          .map((i) => (
            <div
              key={i.id}
              className="flex justify-between gap-3 border-b py-2 text-sm last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate">{i.name}</p>
                <p className="text-muted-foreground text-xs">
                  {i.quantity} {i.unit} ·{" "}
                  {i.purchase_id
                    ? "Comprado"
                    : i.checked
                      ? "En carrito"
                      : "Pendiente"}
                </p>
              </div>
              <span className="shrink-0 tabular-nums">
                {i.estimated_price == null
                  ? "Sin estimado"
                  : formatUSD(i.estimated_price * i.quantity)}
              </span>
            </div>
          ))}
        {snapshot.canViewLists && (
          <p className="text-primary mt-3 text-sm">
            Consulta precios reales y pagos por tienda en la pestaña Compras.
          </p>
        )}
      </section>
      {unassigned.length > 0 && (
        <section className="bg-card rounded-2xl border p-5">
          <h3 className="font-semibold">Otros gastos del viaje</h3>
          <p className="text-muted-foreground text-xs">
            Ya están incluidos en el total real. Puedes asociarlos a un concepto
            sin registrarlos otra vez.
          </p>
          {unassigned.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap justify-between gap-2 py-2 text-sm"
            >
              <span>
                {t.description || "Gasto"} · {t.date}
              </span>
              <span>
                {formatUSD(t.amount)}{" "}
                {snapshot.canViewTransactions && (
                  <Link
                    href={`/transactions/${t.id}`}
                    className="text-primary underline"
                  >
                    Ver
                  </Link>
                )}
              </span>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
