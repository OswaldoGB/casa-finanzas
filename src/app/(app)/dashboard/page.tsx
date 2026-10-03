import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Wallet,
} from "lucide-react";
import { getAnalytics } from "@/features/analytics/queries";
import {
  CashFlowChart,
  MonthlyTrendChart,
} from "@/features/dashboard/components/dashboard-charts";
import { accountNetWorth, cashFlowPoints } from "@/features/dashboard/summary";
import { getDashboardBudgets } from "@/features/budgets/queries";
import { budgetProgress } from "@/features/budgets/schemas";
import { getDashboardSavings } from "@/features/dashboard/queries";

export const metadata = { title: "Inicio" };
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const month = new Intl.DateTimeFormat("es", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const day = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export default async function DashboardPage() {
  const data = await getAnalytics("dashboard");
  const budgets = await getDashboardBudgets(`${data.today.slice(0, 7)}-01`);
  const savings = await getDashboardSavings();
  const pendingLoans =
    savings.loans.reduce(
      (sum, loan) => sum + Math.round(loan.pending * 100),
      0,
    ) / 100;
  const worth =
    Math.round((accountNetWorth(data.accounts) + pendingLoans) * 100) / 100;
  const monthlyNet = data.totals.income - data.totals.expense;
  const until = new Date(`${data.today}T00:00:00Z`);
  until.setUTCDate(until.getUTCDate() + 14);
  const end = until.toISOString().slice(0, 10);
  const upcoming = data.upcoming
    .filter((item) => item.date >= data.today && item.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
  const cashFlow = cashFlowPoints(data.today, data.accounts, upcoming);
  const projected = cashFlow.at(-1)?.balance ?? 0;
  const lowest = Math.min(...cashFlow.map((point) => point.balance));
  const hasActivity = data.trend.some(
    (item) => item.income !== 0 || item.expense !== 0,
  );
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
      <header>
        <p className="text-muted-foreground text-sm capitalize">
          {month.format(new Date(`${data.today}T00:00:00Z`))}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Tu hogar, de un vistazo
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Tus saldos, el movimiento del mes y lo que viene.
        </p>
      </header>
      <section
        aria-label="Resumen financiero"
        className="grid gap-3 sm:grid-cols-3"
      >
        <div className="bg-primary text-primary-foreground rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Patrimonio neto</h2>
            <Wallet className="size-5 opacity-75" aria-hidden />
          </div>
          <p className="mt-5 text-3xl font-semibold tracking-tight tabular-nums">
            {money.format(worth)}
          </p>
          <p className="mt-2 text-xs opacity-75">
            Cuentas menos tarjetas, más préstamos por cobrar
          </p>
        </div>
        <div className="bg-card rounded-2xl border p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-muted-foreground text-sm">Ingresos del mes</h2>
            <ArrowDownLeft className="text-income size-5" aria-hidden />
          </div>
          <p className="mt-5 text-3xl font-semibold tracking-tight tabular-nums">
            {money.format(data.totals.income)}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            Solo movimientos publicados
          </p>
        </div>
        <div className="bg-card rounded-2xl border p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-muted-foreground text-sm">Gastos del mes</h2>
            <ArrowUpRight className="text-expense size-5" aria-hidden />
          </div>
          <p className="mt-5 text-3xl font-semibold tracking-tight tabular-nums">
            {money.format(data.totals.expense)}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            Balance del mes:{" "}
            <strong className={monthlyNet < 0 ? "text-expense" : "text-income"}>
              {money.format(monthlyNet)}
            </strong>
          </p>
        </div>
      </section>
      <section
        className="bg-card rounded-2xl border p-5 sm:p-6"
        aria-label="Presupuestos del mes"
      >
        <h2 className="font-semibold">Presupuestos del mes</h2>
        {budgets.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {budgets.map((budget) => {
              const progress = budgetProgress(budget.available, budget.spent);
              return (
                <div key={budget.id}>
                  <div className="mb-2 flex justify-between gap-2 text-sm">
                    <span>{budget.name}</span>
                    <span className="tabular-nums">
                      {money.format(budget.spent)} /{" "}
                      {money.format(budget.available)}
                    </span>
                  </div>
                  <progress
                    aria-label={budget.name}
                    max={100}
                    value={Math.min(100, progress.percent)}
                    className={`h-2 w-full ${progress.status === "exceeded" || progress.status === "danger" ? "accent-red-500" : progress.status === "warning" ? "accent-amber-500" : "accent-emerald-500"}`}
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    {progress.percent.toFixed(0)}% utilizado
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground mt-3 text-sm">
            Aún no hay presupuestos para este mes.
          </p>
        )}
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="bg-card rounded-2xl border p-5">
          <h2 className="font-semibold">Préstamos por cobrar</h2>
          <p className="mt-3 text-2xl font-semibold">
            {money.format(pendingLoans)}
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            {savings.loans.filter((loan) => loan.overdue).length} préstamos
            vencidos
          </p>
        </section>
        <section className="bg-card rounded-2xl border p-5">
          <h2 className="font-semibold">Metas y provisiones</h2>
          {savings.goals.length ? (
            <ul className="mt-3 space-y-3">
              {savings.goals.map((goal) => (
                <li key={goal.id}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{goal.name}</span>
                    <span>
                      {money.format(goal.balance)} /{" "}
                      {money.format(goal.target_amount)}
                    </span>
                  </div>
                  <progress
                    aria-label={goal.name}
                    max={goal.target_amount}
                    value={Math.min(goal.target_amount, goal.balance)}
                    className="accent-primary mt-1 h-2 w-full"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-3 text-sm">
              Aún no hay metas o provisiones.
            </p>
          )}
        </section>
      </div>
      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        <section
          aria-labelledby="monthly-trend-title"
          className="bg-card min-w-0 rounded-2xl border p-5 sm:p-6 lg:col-span-2"
        >
          <h2 id="monthly-trend-title" className="font-semibold">
            Ingresos y gastos
          </h2>
          <p className="text-muted-foreground mt-1 mb-5 text-xs">
            La tendencia de los últimos 12 meses.
          </p>
          {hasActivity ? (
            <MonthlyTrendChart trend={data.trend} />
          ) : (
            <div className="text-muted-foreground grid min-h-64 place-content-center text-center text-sm">
              <Wallet className="mx-auto mb-3 size-8 opacity-50" aria-hidden />
              <p>Tu tendencia aparecerá al registrar movimientos.</p>
              <p className="mt-1 text-xs">
                Los pendientes no cuentan hasta confirmarse.
              </p>
            </div>
          )}
        </section>
        <section
          aria-labelledby="balances-title"
          className="bg-card min-w-0 rounded-2xl border p-5 sm:p-6"
        >
          <h2 id="balances-title" className="font-semibold">
            Tus cuentas
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Saldos actuales del hogar.
          </p>
          {data.accounts.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              <Wallet className="mx-auto mb-3 size-8 opacity-50" aria-hidden />
              <p>Aún no tienes cuentas registradas.</p>
            </div>
          ) : (
            <ul className="divide-border mt-4 divide-y">
              {data.accounts.map((account) => (
                <li key={account.id} className="flex items-center gap-3 py-3">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: account.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {account.name}
                    </p>
                    {account.type === "credit_card" && (
                      <p className="text-muted-foreground text-xs">
                        Deuda de tarjeta
                      </p>
                    )}
                  </div>
                  <strong className="shrink-0 text-right text-sm tabular-nums">
                    {money.format(account.balance)}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="upcoming-title"
          className="bg-card rounded-2xl border p-5 sm:p-6"
        >
          <div className="flex items-center gap-2">
            <CalendarDays
              className="text-muted-foreground size-4"
              aria-hidden
            />
            <h2 id="upcoming-title" className="font-semibold">
              Próximos 14 días
            </h2>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Recurrentes y vencimientos de tarjetas.
          </p>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No hay movimientos programados para estos días.
            </p>
          ) : (
            <ul className="divide-border mt-4 divide-y">
              {upcoming.map((item) => (
                <li
                  key={`${item.kind}-${item.id}-${item.date}`}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-xl">
                    {item.kind === "card" ? (
                      <CreditCard className="size-4" aria-hidden />
                    ) : (
                      <CalendarDays className="size-4" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {day.format(new Date(`${item.date}T00:00:00Z`))} ·{" "}
                      {item.kind === "card" ? "Pago de tarjeta" : "Recurrente"}
                    </p>
                  </div>
                  <strong
                    className={`shrink-0 text-sm tabular-nums ${item.amount > 0 ? "text-income" : "text-expense"}`}
                  >
                    {item.amount > 0 ? "+" : "−"}
                    {money.format(Math.abs(item.amount))}
                  </strong>
                </li>
              ))}
            </ul>
          )}
          {upcoming.some((item) => item.kind === "card") && (
            <p className="text-muted-foreground mt-3 text-xs">
              Tarjetas: según el estado de cuenta y los pagos registrados.
            </p>
          )}
        </section>
        <section
          aria-labelledby="cash-flow-title"
          className="bg-card rounded-2xl border p-5 sm:p-6"
        >
          <h2 id="cash-flow-title" className="font-semibold">
            Disponible después de lo programado
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Efectivo y bancos, con los movimientos de los próximos 14 días.
          </p>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p
                className={`text-2xl font-semibold tracking-tight tabular-nums ${projected < 0 ? "text-expense" : ""}`}
              >
                {money.format(projected)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Saldo previsto
              </p>
            </div>
            <p className="text-muted-foreground text-xs tabular-nums">
              Hoy: {money.format(cashFlow[0]?.balance ?? 0)}
            </p>
          </div>
          {cashFlow.length > 1 ? (
            <div className="mt-4">
              <CashFlowChart points={cashFlow} />
            </div>
          ) : (
            <p className="text-muted-foreground mt-8 mb-6 text-sm">
              No hay cambios programados en tu efectivo o cuentas bancarias.
            </p>
          )}
          {lowest < 0 && (
            <p className="text-expense mt-3 text-xs" role="status">
              El saldo previsto baja hasta {money.format(lowest)}. Revisa los
              próximos pagos.
            </p>
          )}
          <p className="text-muted-foreground mt-3 text-xs">
            Este cálculo no incluye gastos o ingresos que aún no has programado.
          </p>
        </section>
      </div>
    </div>
  );
}
