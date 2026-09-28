"use client";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { projectCash, type ProjectionInput, type Scenario } from "../logic";
import { ExportButtons } from "@/features/exports/components/export-buttons";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const monthLabel = (date: string) =>
  new Intl.DateTimeFormat("es", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
const field =
  "border-input bg-background h-10 w-full rounded-lg border px-3 text-sm";
export function ProjectionView({ input }: { input: ProjectionInput }) {
  const [months, setMonths] = useState<3 | 6 | 12>(3);
  const [scenario, setScenario] = useState<Scenario>();
  const rows = projectCash(input, months, scenario);
  const firstNegative = rows.find((row) => row.balance < 0);
  const initial =
    input.accounts
      .filter((account) =>
        ["cash", "checking", "savings"].includes(account.type),
      )
      .reduce((sum, account) => sum + Math.round(account.balance * 100), 0) /
    100;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Proyecciones
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Anticipa tu efectivo disponible y prueba un escenario.
          </p>
        </div>
        <label className="text-sm">
          Horizonte
          <select
            className={field + " mt-1"}
            value={months}
            onChange={(event) =>
              setMonths(Number(event.target.value) as 3 | 6 | 12)
            }
          >
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
        </label>
      </header>
      <ExportButtons
        target="projections"
        rows={rows.map((row) => ({
          ...row,
          calculado_al: input.today,
          escenario: scenario
            ? `${scenario.type}: ${scenario.amount} el ${scenario.date}`
            : "Base",
        }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="bg-card rounded-2xl border p-5">
          <h2 className="text-muted-foreground text-sm">Efectivo actual</h2>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {money.format(initial)}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            Efectivo, cuentas bancarias y ahorros.
          </p>
        </section>
        <section className="bg-card rounded-2xl border p-5">
          <h2 className="text-muted-foreground text-sm">
            Saldo al final del horizonte
          </h2>
          <p
            className={
              "mt-2 text-3xl font-semibold tabular-nums " +
              (rows.at(-1)!.balance < 0 ? "text-destructive" : "")
            }
          >
            {money.format(rows.at(-1)!.balance)}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            Incluye el mes actual y su gasto pendiente.
          </p>
        </section>
      </div>
      {firstNegative && (
        <p
          role="status"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm"
        >
          El saldo estimado queda negativo en {monthLabel(firstNegative.month)}.
          Revisa tus gastos previstos o reserva más efectivo.
        </p>
      )}
      <section className="bg-card rounded-2xl border p-5">
        <h2 className="font-semibold">Efectivo al cierre de cada mes</h2>
        <ChartContainer
          className="mt-4 h-72 w-full"
          config={{ balance: { label: "Saldo", color: "var(--primary)" } }}
          aria-label="Proyección de efectivo; los importes aparecen en la tabla siguiente"
        >
          <AreaChart accessibilityLayer data={rows} margin={{ right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
            />
            <YAxis
              width={55}
              tickFormatter={(value) =>
                new Intl.NumberFormat("es", { notation: "compact" }).format(
                  Number(value),
                )
              }
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              labelFormatter={(value) => monthLabel(String(value))}
              formatter={(value) => [money.format(Number(value)), "Saldo"]}
              contentStyle={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: 12,
              }}
            />
            <ReferenceLine
              y={0}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.12}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Estimación mensual en dólares</caption>
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="py-2">
                  Mes
                </th>
                <th scope="col" className="text-right">
                  Entradas
                </th>
                <th scope="col" className="text-right">
                  Salidas previstas
                </th>
                <th scope="col" className="text-right">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month} className="border-b last:border-0">
                  <th scope="row" className="py-3 text-left font-normal">
                    {monthLabel(row.month)}
                  </th>
                  <td className="text-right tabular-nums">
                    {money.format(row.income)}
                  </td>
                  <td className="text-right tabular-nums">
                    {money.format(row.expense)}
                  </td>
                  <td
                    className={
                      "text-right font-medium tabular-nums " +
                      (row.balance < 0 ? "text-destructive" : "")
                    }
                  >
                    {money.format(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="bg-card rounded-2xl border p-5">
        <h2 className="font-semibold">¿Y si…?</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Agrega un ingreso o gasto de prueba. Este escenario no se guarda.
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const amount = Number(data.get("amount"));
            if (amount > 0 && Number.isFinite(amount))
              setScenario({
                type: data.get("type") === "income" ? "income" : "expense",
                amount,
                date: String(data.get("date")),
              });
          }}
        >
          <label className="text-sm">
            Tipo
            <select name="type" className={field + " mt-1"}>
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </label>
          <label className="text-sm">
            Importe
            <input
              name="amount"
              className={field + " mt-1"}
              type="number"
              min="0.01"
              max="999999999.99"
              step="0.01"
              required
              inputMode="decimal"
            />
          </label>
          <label className="text-sm">
            Fecha
            <input
              name="date"
              className={field + " mt-1"}
              type="date"
              min={input.today}
              defaultValue={input.today}
              required
            />
          </label>
          <button
            className="bg-primary text-primary-foreground h-10 rounded-lg px-4 text-sm font-medium"
            type="submit"
          >
            Probar escenario
          </button>
          {scenario && (
            <button
              type="button"
              className="h-10 rounded-lg border px-4 text-sm"
              onClick={() => setScenario(undefined)}
            >
              Quitar escenario
            </button>
          )}
        </form>
        {scenario && (
          <p role="status" className="mt-3 text-sm">
            Escenario activo: {scenario.type === "income" ? "ingreso" : "gasto"}{" "}
            de {money.format(scenario.amount)} el {scenario.date}. Se refleja si
            la fecha está dentro del horizonte elegido.
          </p>
        )}
      </section>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Esta estimación usa saldos publicados, recurrentes activos (incluidos
        los que necesitan confirmación), deuda de tarjetas y presupuestos. Los
        cargos recurrentes de tarjeta se pagan en su vencimiento; sus pagos
        programados se descuentan para evitar duplicarlos. El presupuesto
        reserva efectivo en el mes del gasto y descuenta los recurrentes de su
        categoría. Los meses sin plan usan el presupuesto base actual. No
        incluye intereses, compras futuras sin programar ni ingresos no
        registrados. Una reserva de presupuesto puede anticipar efectivo antes
        del vencimiento real de una tarjeta.
      </p>
    </div>
  );
}
