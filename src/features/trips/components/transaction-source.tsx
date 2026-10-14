import Link from "next/link";
import { formatUSD } from "@/lib/format";
import type { TravelTransactionSource } from "../transaction-source";
export function TransactionTravelSource({
  source,
  canViewProjects,
  canViewLists,
  amount,
}: {
  source: TravelTransactionSource;
  canViewProjects: boolean;
  canViewLists: boolean;
  amount: number;
}) {
  if (!source || (!source.purchase && !source.cost && !source.project?.is_trip))
    return null;
  const itemTotal =
    Math.round(
      source.items.reduce(
        (sum, i) => sum + (i.real_price ?? 0) * i.quantity,
        0,
      ) * 100,
    ) / 100;
  return (
    <section className="bg-card rounded-xl border p-4 text-sm">
      <h2 className="font-semibold">Origen de este gasto</h2>
      <div className="mt-3 space-y-3">
        {source.project && (
          <div>
            <p className="text-muted-foreground text-xs">
              {source.project.is_trip ? "Viaje" : "Proyecto"}
            </p>
            {canViewProjects ? (
              <Link
                href={`/${source.project.is_trip ? "trips" : "projects"}/${source.project.id}${source.project.is_trip ? "?tab=budget" : ""}`}
                className="text-primary font-medium underline"
              >
                {source.project.name}
              </Link>
            ) : (
              <p>{source.project.name}</p>
            )}
          </div>
        )}
        {source.cost && (
          <p>
            Concepto: <strong>{source.cost.name}</strong>
          </p>
        )}
        {source.list && (
          <div>
            <p className="text-muted-foreground text-xs">Lista de compra</p>
            {canViewLists ? (
              <Link
                href={`/lists/${source.list.id}`}
                className="text-primary underline"
              >
                {source.list.name}
              </Link>
            ) : (
              <p>{source.list.name}</p>
            )}
          </div>
        )}
        {source.purchase && (
          <p>
            Lugar de esta compra:{" "}
            <strong>{source.purchase.store_name || "Por decidir"}</strong>
          </p>
        )}
        {source.items.length > 0 && (
          <div className="rounded-lg border p-3">
            <h3 className="mb-2 text-xs font-medium">Artículos incluidos</h3>
            {source.items.map((i, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-3 py-1"
              >
                <span className="min-w-0 break-words">
                  {i.name} · {i.quantity} {i.unit}
                </span>
                <span className="shrink-0">
                  {i.real_price == null
                    ? "Sin precio"
                    : formatUSD(i.real_price * i.quantity)}
                </span>
              </div>
            ))}
            {Math.round(itemTotal * 100) !== Math.round(amount * 100) && (
              <p className="mt-2 text-xs text-amber-500">
                Desglose: {formatUSD(itemTotal)}. El movimiento fue corregido a{" "}
                {formatUSD(amount)}.
              </p>
            )}
          </div>
        )}
        {source.activities.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs">Planeado para</p>
            {source.activities.map((a) => (
              <p key={`${a.date}-${a.title}`}>
                {a.date} · {a.title}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
