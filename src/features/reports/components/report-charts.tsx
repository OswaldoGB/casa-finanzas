"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const compact = new Intl.NumberFormat("es", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const month = (value: string) =>
  new Intl.DateTimeFormat("es", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 7)}-01T00:00:00Z`));
const tooltipStyle = {
  backgroundColor: "var(--card)",
  borderColor: "var(--border)",
  color: "var(--foreground)",
  borderRadius: 12,
};

export function CategoryDonut({
  categories,
}: {
  categories: { id: string; name: string; color: string; amount: number }[];
}) {
  const data = categories
    .filter((item) => item.amount > 0)
    .map((item) => ({ ...item, fill: item.color }));
  if (!data.length)
    return (
      <p className="text-muted-foreground grid min-h-60 place-items-center text-sm">
        No hay gastos por categoría en este período.
      </p>
    );
  return (
    <ChartContainer
      config={{ amount: { label: "Gastos" } }}
      className="mx-auto h-72 w-full max-w-md"
      aria-label="Distribución de gastos por categoría; los valores aparecen en la tabla siguiente"
    >
      <PieChart accessibilityLayer>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="name"
          innerRadius="58%"
          outerRadius="85%"
          paddingAngle={2}
          stroke="var(--card)"
        />
        <Tooltip
          formatter={(value) => money.format(Number(value))}
          contentStyle={tooltipStyle}
        />
      </PieChart>
    </ChartContainer>
  );
}

export function IncomeExpenseChart({
  trend,
}: {
  trend: { month: string; income: number; expense: number }[];
}) {
  if (!trend.some((item) => item.income || item.expense))
    return (
      <p className="text-muted-foreground grid min-h-60 place-items-center text-sm">
        Aún no hay ingresos o gastos publicados para mostrar la tendencia.
      </p>
    );
  return (
    <>
      <ChartContainer
        config={{
          income: { label: "Ingresos", color: "var(--income)" },
          expense: { label: "Gastos", color: "var(--expense)" },
        }}
        className="h-72 w-full"
        aria-label="Ingresos y gastos por mes"
      >
        <BarChart
          accessibilityLayer
          data={trend}
          margin={{ left: 0, right: 12, top: 12 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={month}
            tickLine={false}
            axisLine={false}
            minTickGap={20}
          />
          <YAxis
            tickFormatter={(value) => compact.format(Number(value))}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            labelFormatter={(value) => month(String(value))}
            formatter={(value, name) => [
              money.format(Number(value)),
              name === "income" ? "Ingresos" : "Gastos",
            ]}
            contentStyle={tooltipStyle}
          />
          <Legend
            formatter={(value) => (value === "income" ? "Ingresos" : "Gastos")}
          />
          <Bar
            dataKey="income"
            fill="var(--color-income)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="expense"
            fill="var(--color-expense)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
      <details className="mt-3 text-sm">
        <summary className="text-muted-foreground cursor-pointer">
          Ver datos mensuales
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Ingresos y gastos de los últimos doce meses
            </caption>
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="py-2">
                  Mes
                </th>
                <th scope="col" className="text-right">
                  Ingresos
                </th>
                <th scope="col" className="text-right">
                  Gastos
                </th>
              </tr>
            </thead>
            <tbody>
              {trend.map((item) => (
                <tr key={item.month} className="border-b">
                  <th scope="row" className="py-2 text-left font-normal">
                    {month(item.month)}
                  </th>
                  <td className="text-right tabular-nums">
                    {money.format(item.income)}
                  </td>
                  <td className="text-right tabular-nums">
                    {money.format(item.expense)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

export function NetWorthChart({
  netWorth,
}: {
  netWorth: { month: string; balance: number }[];
}) {
  if (!netWorth.length)
    return (
      <p className="text-muted-foreground grid min-h-60 place-items-center text-sm">
        Agrega una cuenta para ver la evolución del patrimonio.
      </p>
    );
  return (
    <>
      <ChartContainer
        config={{ balance: { label: "Patrimonio", color: "var(--primary)" } }}
        className="h-72 w-full"
        aria-label="Evolución mensual del patrimonio neto"
      >
        <AreaChart
          accessibilityLayer
          data={netWorth}
          margin={{ left: 0, right: 12, top: 12 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={month}
            tickLine={false}
            axisLine={false}
            minTickGap={20}
          />
          <YAxis
            tickFormatter={(value) => compact.format(Number(value))}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            labelFormatter={(value) => month(String(value))}
            formatter={(value) => [money.format(Number(value)), "Patrimonio"]}
            contentStyle={tooltipStyle}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--color-balance)"
            fill="var(--color-balance)"
            fillOpacity={0.12}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
      <details className="mt-3 text-sm">
        <summary className="text-muted-foreground cursor-pointer">
          Ver patrimonio mensual
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {netWorth.map((item) => (
            <div key={item.month} className="contents">
              <dt>{month(item.month)}</dt>
              <dd className="text-right tabular-nums">
                {money.format(item.balance)}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </>
  );
}
