import { ExportButtons } from "@/features/exports/components/export-buttons";
import { getSavings } from "@/features/savings/queries";
import { suggestedMonthly } from "@/features/savings/schemas";
import {
  GoalForm,
  GoalOperationForm,
  DeleteGoalForm,
  RestartProvisionForm,
} from "@/features/savings/components/savings-forms";
import { provisionPlan } from "@/features/savings/paydays";
import { formatUSD } from "@/lib/format";
export const metadata = { title: "Ahorros y reservas" };
export default async function SavingsPage() {
  const data = await getSavings();
  const reserved = data.goals
    .filter((g) => g.type === "provision" && !g.account_id)
    .reduce((sum, g) => sum + g.balance, 0);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Ahorros y reservas</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Aparta para tus metas y para compras que ya sabes que vendrán.
          {reserved > 0 &&
            ` Tienes ${formatUSD(reserved)} reservado dentro de tus cuentas.`}
        </p>
      </header>
      <ExportButtons target="savings" />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <section
          className="stagger grid gap-4 sm:grid-cols-2"
          aria-label="Metas y provisiones"
        >
          {data.goals.length ? (
            data.goals.map((goal) => {
              const percent = Math.min(
                100,
                Math.max(0, (goal.balance / goal.target_amount) * 100),
              );
              const monthly = suggestedMonthly(
                goal.target_amount,
                goal.balance,
                data.today,
                goal.target_date,
              );
              const plan = provisionPlan(goal, data.today);
              const period = goal.cadence === "mensual" ? "este mes" : "esta quincena";
              return (
                <article
                  key={goal.id}
                  id={goal.id}
                  className="bg-card min-w-0 rounded-2xl border p-5"
                >
                  <div className="flex items-center gap-4">
                    <svg
                      viewBox="0 0 44 44"
                      className="size-16 shrink-0 -rotate-90"
                      role="img"
                      aria-label={`${percent.toFixed(0)}% de la meta`}
                    >
                      <circle
                        cx="22"
                        cy="22"
                        r="18"
                        fill="none"
                        stroke="currentColor"
                        className="text-muted"
                        strokeWidth="4"
                      />
                      <circle
                        cx="22"
                        cy="22"
                        r="18"
                        fill="none"
                        stroke={goal.color}
                        strokeWidth="4"
                        pathLength="100"
                        strokeDasharray={`${percent} 100`}
                      />
                    </svg>
                    <div>
                      <p className="text-muted-foreground text-xs">
                        {goal.type === "provision"
                          ? "Provisión"
                          : "Meta de ahorro"}
                      </p>
                      <h2 className="mt-1 font-semibold">{goal.name}</h2>
                      <p className="text-sm">{percent.toFixed(0)}%</p>
                    </div>
                  </div>
                  <p className="mt-4 text-xl font-semibold tabular-nums">
                    {formatUSD(goal.balance)}{" "}
                    <span className="text-muted-foreground text-sm font-normal">
                      de {formatUSD(goal.target_amount)}
                    </span>
                  </p>
                  {plan ? (
                    <p
                      className={`mt-2 text-sm ${plan.due ? "text-primary font-medium" : "text-muted-foreground"}`}
                    >
                      {plan.missing === 0
                        ? "Reserva completa. Cuando lo compres, ligas el gasto y vuelve a empezar."
                        : plan.due
                          ? `Te toca apartar ${formatUSD(plan.perPayday)} ${period}.`
                          : `Al día. Próximo aporte: ${formatUSD(plan.perPayday)} el ${plan.nextPayday}.`}
                    </p>
                  ) : (
                  <p className="text-muted-foreground mt-2 text-sm">
                    {monthly === null
                      ? "Agrega una fecha para calcular el aporte mensual."
                      : monthly === 0
                        ? "Objetivo alcanzado."
                        : `Aporte sugerido: ${formatUSD(monthly)} al mes`}
                  </p>
                  )}
                  {goal.last_purchase_date && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Última compra: {goal.last_purchase_date}
                    </p>
                  )}
                  {goal.target_date && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Fecha objetivo: {goal.target_date}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-2 text-xs">
                    {goal.account_id
                      ? "Dinero en cuenta vinculada"
                      : "Apartado virtual; no altera el saldo bancario"}
                  </p>
                  {data.canOperate && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm">
                        Aportar o retirar
                      </summary>
                      <div className="mt-3">
                        <GoalOperationForm
                          goal={goal}
                          today={data.today}
                          accounts={data.accounts}
                        />
                      </div>
                    </details>
                  )}
                  {data.canOperate && goal.type === "provision" && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm">
                        Ya lo compré
                      </summary>
                      <div className="mt-3">
                        <RestartProvisionForm goal={goal} expenses={data.expenses} />
                      </div>
                    </details>
                  )}
                  {data.canEdit && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm">
                        Editar meta
                      </summary>
                      <div className="mt-3">
                        <GoalForm goal={goal} accounts={data.accounts} today={data.today} />
                        <DeleteGoalForm goal={goal} />
                      </div>
                    </details>
                  )}
                </article>
              );
            })
          ) : (
            <p className="bg-card text-muted-foreground rounded-2xl border p-8 sm:col-span-2">
              Crea tu primera meta o provisión.
            </p>
          )}
        </section>
        {data.canEdit && (
          <aside id="new-savings" className="bg-card rounded-2xl border p-5">
            <h2 className="mb-4 font-semibold">Nueva meta o reserva</h2>
            <GoalForm accounts={data.accounts} today={data.today} />
          </aside>
        )}
      </div>
    </div>
  );
}
