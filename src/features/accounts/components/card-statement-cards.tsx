import { CheckCircle2, Clock3, CreditCard } from "lucide-react";
import type { CardStatementSummary } from "../card-settlement";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const statusStyle = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  partial: "bg-primary/15 text-primary",
  settled: "bg-income/15 text-income",
};
const statusLabel = {
  pending: "Pendiente",
  partial: "Parcial",
  settled: "Saldado",
};

export function CardStatementCards({
  statements,
  balance,
  future,
}: {
  statements: CardStatementSummary[];
  balance: number;
  future: number;
}) {
  const next = statements.find((statement) => statement.status !== "settled");
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="Deuda total"
          value={money.format(balance)}
          detail="Incluye cuotas futuras"
        />
        <Metric
          label="Próximo pago según banco"
          value={next ? money.format(next.unpaid) : "Al día"}
          detail={next ? `Vence ${next.dueOn}` : "Sin cortes pendientes"}
        />
        <Metric
          label="Cuotas futuras"
          value={money.format(future)}
          detail="Aún no llegan a corte"
        />
      </div>
      {statements.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <p className="font-medium">Estados conciliados</p>
          {statements.map((statement) => {
            const settled = statement.installments.filter(
              (item) => item.status === "settled",
            ).length;
            return (
              <article
                key={statement.id}
                className="bg-muted/50 rounded-xl border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">Corte {statement.closesOn}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Pago límite: {statement.dueOn}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[statement.status]}`}
                  >
                    {statement.status === "settled" ? (
                      <CheckCircle2 className="mr-1 inline size-3.5" />
                    ) : (
                      <Clock3 className="mr-1 inline size-3.5" />
                    )}
                    {statusLabel[statement.status]}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                  <p>
                    Banco <strong>{money.format(statement.bankDue)}</strong>
                  </p>
                  <p>
                    App <strong>{money.format(statement.appTotal)}</strong>
                  </p>
                  <p>
                    Pagado <strong>{money.format(statement.paid)}</strong>
                  </p>
                </div>
                <progress
                  className="accent-primary mt-3 h-2 w-full"
                  max={statement.bankDue}
                  value={statement.paid}
                  aria-label={`Pago del corte ${statement.closesOn}`}
                />
                <div className="text-muted-foreground mt-2 flex flex-wrap justify-between gap-2 text-xs">
                  <span>Restan {money.format(statement.unpaid)}</span>
                  <span>
                    <CreditCard className="mr-1 inline size-3.5" />
                    Cuotas: {settled} de {statement.installments.length}{" "}
                    saldadas
                  </span>
                </div>
                {statement.note && (
                  <p className="text-muted-foreground mt-3 border-t pt-3 text-xs">
                    {statement.note}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-muted/50 rounded-xl border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
    </div>
  );
}
