import { ExportButtons } from "@/features/exports/components/export-buttons";
import { Wallet } from "lucide-react";
import { getBudgets } from "@/features/budgets/queries";
import {
  BudgetForm,
  CopyBudgetForm,
  DeleteBudgetForm,
} from "@/features/budgets/components/budget-forms";
import { budgetProgress } from "@/features/budgets/schemas";
import { formatUSD } from "@/lib/format";

export const metadata = { title: "Presupuestos" };

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: selectedMonth } = await searchParams;
  const { month, budgets, categories, canEdit } =
    await getBudgets(selectedMonth);
  const available = budgets.reduce((sum, budget) => sum + budget.available, 0);
  const spent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const usedCategories = new Set(budgets.map((budget) => budget.category_id));
  const remainingCategories = categories.filter(
    (category) => !usedCategories.has(category.id),
  );
  const monthLabel = new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}T12:00:00Z`));
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Presupuestos
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Dale un destino a tu dinero, categoría por categoría.
          </p>
        </div>
        {canEdit && <CopyBudgetForm month={month} />}
      </header>
      <ExportButtons target="budgets" filters={{ month }} />
      <form className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="budget-month" className="block text-sm font-medium">
            Mes
          </label>
          <input
            id="budget-month"
            name="month"
            type="month"
            defaultValue={month.slice(0, 7)}
            required
            className="border-input bg-background h-10 rounded-lg border px-3 text-sm"
          />
        </div>
        <button className="bg-background focus-visible:ring-ring h-10 rounded-lg border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
          Ver mes
        </button>
        <p className="text-muted-foreground pb-2 text-sm capitalize">
          {monthLabel}
        </p>
      </form>
      <section
        className="grid gap-3 sm:grid-cols-3"
        aria-label="Resumen del mes"
      >
        {[
          ["Disponible con arrastre", available],
          ["Gastado en estas categorías", spent],
          ["Por gastar", available - spent],
        ].map(([label, amount]) => (
          <div key={label} className="bg-card rounded-2xl border p-5">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p
              className={`mt-2 text-2xl font-semibold tabular-nums ${Number(amount) < 0 ? "text-destructive" : ""}`}
            >
              {formatUSD(Number(amount))}
            </p>
          </div>
        ))}
      </section>
      <p className="text-muted-foreground text-xs">
        Se cuentan gastos confirmados de cada categoría exacta. Las
        subcategorías tienen su propio presupuesto.
      </p>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-label="Presupuestos por categoría" className="space-y-3">
          {budgets.length === 0 ? (
            <div className="bg-card flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center">
              <Wallet
                className="text-muted-foreground mb-4 size-10"
                aria-hidden
              />
              <h2 className="font-medium">Este mes está por planificar</h2>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                {canEdit
                  ? "Crea un presupuesto por categoría o copia el mes anterior."
                  : "Todavía no hay presupuestos para este mes."}
              </p>
            </div>
          ) : (
            budgets.map((budget) => {
              const progress = budgetProgress(budget.available, budget.spent);
              const barColor =
                progress.status === "exceeded" || progress.status === "danger"
                  ? "bg-destructive"
                  : progress.status === "warning"
                    ? "bg-amber-500"
                    : "bg-primary";
              return (
                <article
                  key={budget.id}
                  className="bg-card rounded-2xl border p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="flex items-center gap-2 font-medium">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: budget.color }}
                        aria-hidden
                      />
                      {budget.name}
                    </h2>
                    <span
                      className={`text-sm font-medium tabular-nums ${progress.remaining < 0 ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {progress.percent.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    className="bg-muted mt-4 h-2 overflow-hidden rounded-full"
                    role="progressbar"
                    aria-label={`Gasto de ${budget.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(100, Math.round(progress.percent))}
                    aria-valuetext={`${formatUSD(budget.spent)} de ${formatUSD(budget.available)}`}
                  >
                    <div
                      className={`${barColor} h-full rounded-full transition-all`}
                      style={{ width: `${Math.min(100, progress.percent)}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm tabular-nums">
                    <p>
                      {formatUSD(budget.spent)}{" "}
                      <span className="text-muted-foreground">
                        de {formatUSD(budget.available)}
                      </span>
                    </p>
                    <p
                      className={
                        progress.remaining < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {progress.remaining < 0
                        ? `Exceso: ${formatUSD(-progress.remaining)}`
                        : `Quedan ${formatUSD(progress.remaining)}`}
                    </p>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Base {formatUSD(budget.amount)}
                    {budget.carried > 0 &&
                      ` + sobrante ${formatUSD(budget.carried)}`}
                    {budget.carry_over && " · Arrastre activado"}
                  </p>
                  {canEdit && (
                    <details className="mt-4 border-t pt-3">
                      <summary className="focus-visible:ring-ring cursor-pointer rounded text-sm font-medium focus-visible:ring-2">
                        Editar presupuesto
                      </summary>
                      <div className="mt-4">
                        <BudgetForm
                          month={month}
                          categories={categories}
                          budget={budget}
                        />
                        <DeleteBudgetForm id={budget.id} name={budget.name} />
                      </div>
                    </details>
                  )}
                </article>
              );
            })
          )}
        </section>
        {canEdit && (
          <aside className="bg-card rounded-2xl border p-5">
            <h2 className="mb-4 font-medium">Nuevo presupuesto</h2>
            {remainingCategories.length ? (
              <BudgetForm
                key={month}
                month={month}
                categories={remainingCategories}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Todas las categorías activas ya tienen presupuesto. Puedes
                editar los existentes o crear categorías en Configuración.
              </p>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
