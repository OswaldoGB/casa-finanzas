import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveAccount } from "@/features/accounts/actions";
import { AccountForm } from "@/features/accounts/components/account-form";
import { getAccount } from "@/features/accounts/queries";

export const metadata = { title: "Detalle de cuenta" };
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function AccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getAccount(id);
  if (!result?.account) notFound();
  const { account, canEdit, statement, history } = result;
  const card = account.type === "credit_card";
  const utilization =
    card && account.credit_limit
      ? Math.max(
          0,
          Math.min(100, (account.balance / account.credit_limit) * 100),
        )
      : 0;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/accounts"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Cuentas y tarjetas
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {account.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {account.is_archived
              ? "Cuenta archivada"
              : card
                ? "Tarjeta de crédito"
                : "Cuenta activa"}
          </p>
        </div>
        <div className="bg-card rounded-xl border px-5 py-3 text-right">
          <p className="text-muted-foreground text-xs">
            {card ? "Deuda actual" : "Saldo actual"}
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {money.format(account.balance)}
          </p>
        </div>
      </header>
      {card && (
        <section
          aria-label="Detalles de la tarjeta"
          className="bg-card space-y-4 rounded-2xl border p-5 sm:p-6"
        >
          <div className="flex justify-between gap-3 text-sm">
            <span>Límite de crédito</span>
            <strong className="tabular-nums">
              {money.format(account.credit_limit ?? 0)}
            </strong>
          </div>
          <div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${utilization}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-1 text-xs tabular-nums">
              {Math.round(utilization)} % del límite utilizado
            </p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              Día de corte: <strong>{account.statement_closing_day}</strong>
            </p>
            <p>
              Día de pago: <strong>{account.payment_due_day}</strong>
            </p>
          </div>
          {statement && (
            <div className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
              <p>
                Último corte: <strong>{statement.closesOn}</strong>
              </p>
              <p>
                Fecha límite de pago: <strong>{statement.dueOn}</strong>
              </p>
              <p className="sm:col-span-2">
                Saldo al corte:{" "}
                <strong>{money.format(statement.balance)}</strong>
              </p>
            </div>
          )}
        </section>
      )}
      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Movimientos recientes</h2>
          <ul className="divide-border divide-y rounded-xl border">
            {history.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/transactions/${item.id}`}
                  className="hover:bg-muted/50 flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {item.description ||
                        (item.type === "transfer"
                          ? "Transferencia"
                          : "Movimiento")}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {item.date}
                      {item.status === "pending" ? " · Pendiente" : ""}
                    </span>
                  </span>
                  <strong className="shrink-0 tabular-nums">
                    {money.format(Number(item.amount))}
                  </strong>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
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
