import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveAccount } from "@/features/accounts/actions";
import { AccountForm } from "@/features/accounts/components/account-form";
import { getAccount } from "@/features/accounts/queries";
import { randomUUID } from "node:crypto";
import { CategoryIcon } from "@/features/catalogs/components/category-icon";

import { CreditCardDetail } from "@/features/accounts/components/credit-card-detail";

export const metadata = { title: "Detalle de cuenta" };
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const movementLabel: Record<string, string> = {
  income: "Ingreso",
  expense: "Gasto",
  transfer: "Transferencia",
  loan_out: "Préstamo",
  loan_repayment: "Abono",
  goal_contribution: "Aporte",
  goal_withdrawal: "Retiro",
};
function movementStyle(type: string) {
  if (type === "income" || type === "loan_repayment")
    return {
      chip: "bg-income/15 text-income",
      amount: "text-income",
      sign: "+",
    };
  if (type === "expense")
    return {
      chip: "bg-destructive/15 text-destructive",
      amount: "text-destructive",
      sign: "−",
    };
  if (type === "loan_out")
    return {
      chip: "bg-warning/15 text-warning",
      amount: "text-warning",
      sign: "−",
    };
  return {
    chip: "bg-muted text-muted-foreground",
    amount: "text-info",
    sign: "",
  };
}

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { id } = await params;
  const { section } = await searchParams;
  const result = await getAccount(id);
  if (!result?.account) notFound();
  const {
    account,
    canEdit,
    statement,
    history,
    historyCategories,
    plans,
    schedule,
    today,
    firstClose,
    categories,
    canTransact,
    paymentAccounts,
    statements,
    payments,
  } = result;
  const card = account.type === "credit_card";
  const categoryById = new Map(
    historyCategories.map((category) => [category.id, category]),
  );
  const movements = (
    <div>
      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Movimientos recientes</h2>
          <ul className="divide-border divide-y rounded-xl border">
            {history.map((item) => {
              const style = movementStyle(item.type);
              const category = item.category_id
                ? categoryById.get(item.category_id)
                : undefined;
              return (
                <li key={item.id}>
                  <Link
                    href={`/transactions/${item.id}`}
                    className="hover:bg-muted/50 flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {item.description ||
                          movementLabel[item.type] ||
                          "Movimiento"}
                      </span>
                      <span className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                        <span
                          className={`rounded-full px-1.5 py-0.5 font-medium ${style.chip}`}
                        >
                          {movementLabel[item.type] ?? "Movimiento"}
                        </span>
                        {category && (
                          <span className="flex items-center gap-1.5">
                            <CategoryIcon
                              icon={category.icon}
                              color={category.color}
                              className="size-3.5"
                            />
                            {category.name}
                          </span>
                        )}
                        {item.date}
                        {item.status === "pending" && "· Pendiente"}
                      </span>
                    </span>
                    <strong className={`shrink-0 tabular-nums ${style.amount}`}>
                      {style.sign}
                      {money.format(Number(item.amount))}
                    </strong>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
  if (card && statement)
    return (
      <CreditCardDetail
        initialSection={section}
        account={account}
        canEdit={canEdit}
        canTransact={canTransact}
        today={today}
        firstClose={firstClose}
        requestId={randomUUID()}
        estimate={statement}
        plans={plans}
        schedule={schedule}
        categories={categories}
        paymentAccounts={paymentAccounts}
        statements={statements}
        payments={payments}
        movements={movements}
      />
    );
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/accounts"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Billetera
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {account.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {account.is_archived ? "Cuenta archivada" : "Cuenta activa"}
          </p>
        </div>
        <div className="bg-card rounded-xl border px-5 py-3 text-right">
          <p className="text-muted-foreground text-xs">Saldo actual</p>
          <p className="text-2xl font-semibold tabular-nums">
            {money.format(account.balance)}
          </p>
        </div>
      </header>
      {movements}
      {canEdit && !account.is_archived && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Editar cuenta</h2>
          <div className="bg-card rounded-2xl border p-5 sm:p-6">
            <AccountForm account={account} />
          </div>
          <form action={archiveAccount} className="pt-2">
            <input type="hidden" name="id" value={account.id} />
            <button
              type="submit"
              className="text-destructive focus-visible:ring-ring rounded text-sm font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
            >
              Archivar cuenta
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
