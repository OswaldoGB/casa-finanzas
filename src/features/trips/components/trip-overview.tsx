import { formatUSD } from "@/lib/format";
import { tripTotals } from "../totals";
import type { TripSnapshot } from "../schemas";
export function TripOverview({ snapshot }: { snapshot: TripSnapshot }) {
  const t = tripTotals(snapshot);
  const progress =
    t.maximum > 0 ? Math.min(100, (t.projected / t.maximum) * 100) : 0;
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          ["Presupuesto máximo", t.maximum],
          ["Costo estimado", t.estimated],
          ["Gasto real", t.real],
          ["Previsto pendiente", t.pending],
          ["Proyección final", t.projected],
          ["Margen disponible", t.margin],
        ].map(([label, value]) => (
          <div
            key={label}
            className="bg-card min-w-0 rounded-2xl border p-4 sm:p-5"
          >
            <p className="text-muted-foreground text-xs">{label}</p>
            <p
              className={`mt-2 text-xl font-semibold tabular-nums sm:text-2xl ${label === "Margen disponible" ? (Number(value) < 0 ? "text-destructive" : "text-income") : ""}`}
            >
              {formatUSD(Number(value))}
            </p>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-2xl border p-5">
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <p>Cómo va el presupuesto</p>
          <strong>
            {t.maximum > 0
              ? `${Math.round((t.projected / t.maximum) * 100)}% previsto`
              : "Máximo $0.00"}
          </strong>
        </div>
        <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full transition-all duration-300 motion-reduce:transition-none ${t.margin < 0 ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          La proyección combina lo ya pagado con lo previsto que falta. No son
          cargos nuevos.
        </p>
        {t.missingPrices > 0 && (
          <p className="mt-2 text-sm text-amber-500">
            Hay {t.missingPrices} precios sin definir. El estimado y la
            proyección están incompletos.
          </p>
        )}
        {t.pending === 0 && t.real > 0 && t.missingPrices === 0 && (
          <p
            className={
              t.difference < 0
                ? "text-destructive mt-2 text-sm"
                : "text-income mt-2 text-sm"
            }
          >
            {t.difference < 0 ? "Sobrecosto" : "Ahorro frente al estimado"}:{" "}
            {formatUSD(Math.abs(t.difference))}
          </p>
        )}
      </div>
      <div className="bg-card grid gap-4 rounded-2xl border p-5 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs">Por hacer</p>
          <p className="mt-1 font-medium">
            {snapshot.activities.length} actividades planeadas
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Compras</p>
          <p className="mt-1 font-medium">
            {snapshot.purchases.length} compras registradas
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Quiénes van</p>
          <p className="mt-1 font-medium break-words">
            {snapshot.detail.participants || "Sin indicar"}
          </p>
        </div>
      </div>
      {snapshot.project.description && (
        <p className="text-muted-foreground rounded-xl border p-4 text-sm break-words whitespace-pre-wrap">
          {snapshot.project.description}
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        El gasto real usa los movimientos del viaje, incluso anticipos pagados
        antes de salir. Cada gasto también cuenta en su categoría y mes, sin
        duplicarse.
      </p>
    </section>
  );
}
