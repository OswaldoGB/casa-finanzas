import { ExportButtons } from "@/features/exports/components/export-buttons";
import { getAnalytics } from "@/features/analytics/queries";
import {
  CategoryDonut,
  IncomeExpenseChart,
  NetWorthChart,
} from "@/features/reports/components/report-charts";

export const metadata = { title: "Reportes" };
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const inputClass =
  "border-input bg-background h-10 rounded-lg border px-3 text-sm";

function AmountTable({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { id: string; name: string; amount: number }[];
  empty: string;
}) {
  return (
    <section className="bg-card rounded-2xl border p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {rows.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="py-2 text-left font-medium">
                  Nombre
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Gastos
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <th scope="row" className="py-3 text-left font-normal">
                    {item.name}
                  </th>
                  <td className="py-3 text-right tabular-nums">
                    {money.format(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted-foreground py-8 text-sm">{empty}</p>
      )}
    </section>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const data = await getAnalytics(
    "reports",
    typeof params.from === "string" ? params.from : undefined,
    typeof params.to === "string" ? params.to : undefined,
  );
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Entiende cómo entra y sale el dinero del hogar.
          </p>
        </div>
        <form className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs" htmlFor="report-from">
            Desde
            <input
              id="report-from"
              name="from"
              type="date"
              defaultValue={data.from}
              className={inputClass}
              required
            />
          </label>
          <label className="grid gap-1 text-xs" htmlFor="report-to">
            Hasta
            <input
              id="report-to"
              name="to"
              type="date"
              defaultValue={data.to}
              className={inputClass}
              required
            />
          </label>
          <button className="bg-primary text-primary-foreground h-10 rounded-lg px-4 text-sm font-medium">
            Aplicar
          </button>
        </form>
      </header>
      <ExportButtons target="reports" />
      <p className="text-muted-foreground text-xs">
        Los totales incluyen solo ingresos y gastos publicados. Las
        transferencias y los movimientos pendientes se excluyen.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            title: "Ingresos del período",
            amount: data.totals.income,
            color: "text-income",
          },
          {
            title: "Gastos del período",
            amount: data.totals.expense,
            color: "text-destructive",
          },
          {
            title: "Diferencia",
            amount: data.totals.income - data.totals.expense,
            color: "",
          },
        ].map((item) => (
          <div key={item.title} className="bg-card rounded-2xl border p-5">
            <p className="text-muted-foreground text-sm">{item.title}</p>
            <p
              className={`mt-3 text-2xl font-semibold tabular-nums ${item.color}`}
            >
              {money.format(item.amount)}
            </p>
          </div>
        ))}
      </div>
      <section className="bg-card rounded-2xl border p-5">
        <h2 className="text-base font-semibold">Gastos por categoría</h2>
        <div className="mt-3 grid items-center gap-6 lg:grid-cols-2">
          <CategoryDonut categories={data.categories} />
          {data.categories.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Gastos por categoría en el rango seleccionado
                </caption>
                <thead>
                  <tr className="border-b">
                    <th scope="col" className="py-2 text-left font-medium">
                      Categoría
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Monto
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <th scope="row" className="py-3 text-left font-normal">
                        <span
                          aria-hidden
                          className="mr-2 inline-block size-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </th>
                      <td className="py-3 text-right tabular-nums">
                        {money.format(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Los gastos publicados aparecerán aquí al registrarlos.
            </p>
          )}
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-card min-w-0 rounded-2xl border p-5">
          <h2 className="text-base font-semibold">
            Ingresos y gastos · 12 meses
          </h2>
          <p className="text-muted-foreground mt-1 mb-4 text-xs">
            Tendencia mensual hasta el final del rango seleccionado.
          </p>
          <IncomeExpenseChart trend={data.trend} />
        </section>
        <section className="bg-card min-w-0 rounded-2xl border p-5">
          <h2 className="text-base font-semibold">Evolución del patrimonio</h2>
          <p className="text-muted-foreground mt-1 mb-4 text-xs">
            Cuentas menos tarjetas, más préstamos pendientes por cobrar.
          </p>
          <NetWorthChart netWorth={data.accounts.length ? data.netWorth : []} />
        </section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <AmountTable
          title="Gastos por método de pago"
          rows={data.methods}
          empty="No hay gastos por método de pago en este período."
        />
        <section className="bg-card rounded-2xl border p-5">
          <h2 className="text-base font-semibold">Movimientos por usuario</h2>
          {data.users.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Ingresos y gastos por usuario en el rango seleccionado
                </caption>
                <thead>
                  <tr className="border-b text-left">
                    <th scope="col" className="py-2 font-medium">
                      Usuario
                    </th>
                    <th scope="col" className="text-right font-medium">
                      Ingresos
                    </th>
                    <th scope="col" className="text-right font-medium">
                      Gastos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <th scope="row" className="py-3 text-left font-normal">
                        {item.name}
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
          ) : (
            <p className="text-muted-foreground py-8 text-sm">
              No hay movimientos por usuario en este período.
            </p>
          )}
        </section>
      </div>
      <AmountTable
        title="Gastos por proyecto"
        rows={data.projects}
        empty="No hay gastos vinculados a proyectos en este período."
      />
    </div>
  );
}
