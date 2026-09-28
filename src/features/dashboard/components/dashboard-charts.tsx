"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const month = new Intl.DateTimeFormat("es", {
  month: "short",
  timeZone: "UTC",
});
const day = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const date = (value: string) =>
  new Date(`${value.length === 7 ? `${value}-01` : value}T00:00:00Z`);

export function MonthlyTrendChart({
  trend,
}: {
  trend: { month: string; income: number; expense: number }[];
}) {
  return (
    <>
      <ChartContainer
        aria-label="Ingresos y gastos por mes"
        config={{
          income: { label: "Ingresos", color: "var(--income)" },
          expense: { label: "Gastos", color: "var(--expense)" },
        }}
        className="h-64 w-full"
      >
        <BarChart
          accessibilityLayer
          data={trend}
          margin={{ left: -15, right: 5, top: 10 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => month.format(date(String(value)))}
            minTickGap={20}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${compact.format(Number(value))}`}
            width={60}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => month.format(date(String(value)))}
                formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-5">
                    <span className="text-muted-foreground">
                      {name === "income" ? "Ingresos" : "Gastos"}
                    </span>
                    <strong className="tabular-nums">
                      {money.format(Number(value))}
                    </strong>
                  </span>
                )}
              />
            }
          />
          <Bar
            dataKey="income"
            fill="var(--color-income)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
          <Bar
            dataKey="expense"
            fill="var(--color-expense)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ChartContainer>
      <div className="text-muted-foreground flex justify-center gap-5 text-xs">
        <span className="flex items-center gap-2">
          <span className="bg-income size-2 rounded-full" />
          Ingresos
        </span>
        <span className="flex items-center gap-2">
          <span className="bg-expense size-2 rounded-full" />
          Gastos
        </span>
      </div>
      <details className="text-muted-foreground mt-4 text-xs">
        <summary className="cursor-pointer">Ver datos por mes</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-right tabular-nums">
            <thead>
              <tr>
                <th scope="col" className="py-2 text-left">
                  Mes
                </th>
                <th scope="col">Ingresos</th>
                <th scope="col">Gastos</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((item) => (
                <tr key={item.month} className="border-t">
                  <th
                    scope="row"
                    className="py-2 text-left font-normal capitalize"
                  >
                    {month.format(date(item.month))}
                  </th>
                  <td>{money.format(item.income)}</td>
                  <td>{money.format(item.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

export function CashFlowChart({
  points,
}: {
  points: { date: string; balance: number }[];
}) {
  return (
    <>
      <ChartContainer
        aria-label="Saldo disponible después de los movimientos programados"
        config={{ balance: { label: "Disponible", color: "var(--primary)" } }}
        className="h-44 w-full"
      >
        <AreaChart
          accessibilityLayer
          data={points}
          margin={{ left: -15, right: 10, top: 5 }}
        >
          <defs>
            <linearGradient
              id="dashboard-cash-gradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
              <stop
                offset="100%"
                stopColor="var(--primary)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => day.format(date(String(value)))}
            minTickGap={25}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${compact.format(Number(value))}`}
            width={60}
          />
          <ReferenceLine
            y={0}
            stroke="var(--muted-foreground)"
            strokeDasharray="3 3"
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) => day.format(date(String(value)))}
                formatter={(value) => (
                  <strong className="tabular-nums">
                    {money.format(Number(value))}
                  </strong>
                )}
              />
            }
          />
          <Area
            type="stepAfter"
            dataKey="balance"
            stroke="var(--primary)"
            fill="url(#dashboard-cash-gradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
      <details className="text-muted-foreground mt-4 text-xs">
        <summary className="cursor-pointer">Ver saldos previstos</summary>
        <table className="mt-3 w-full text-right tabular-nums">
          <thead>
            <tr>
              <th scope="col" className="py-2 text-left">
                Fecha
              </th>
              <th scope="col">Disponible</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point, index) => (
              <tr key={`${point.date}-${index}`} className="border-t">
                <th scope="row" className="py-2 text-left font-normal">
                  {index === 0
                    ? "Hoy, antes de lo programado"
                    : day.format(date(point.date))}
                </th>
                <td>{money.format(point.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
