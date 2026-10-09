import { ExportButtons } from "@/features/exports/components/export-buttons";
import Link from "next/link";
import { Landmark, PiggyBank, Wallet } from "lucide-react";
import { getAccounts } from "@/features/accounts/queries";
import { CardArtwork } from "@/features/accounts/components/card-artwork";

export const metadata = { title: "Billetera" };

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const typeLabel: Record<string, string> = {
  cash: "Efectivo",
  checking: "Cuenta corriente",
  savings: "Ahorros",
  credit_card: "Tarjeta de crédito",
  investment: "Inversión",
  other: "Otra cuenta",
};

export default async function AccountsPage() {
  const { accounts, canEdit } = await getAccounts();
  const active = accounts.filter((account) => !account.is_archived);
  const cards = active.filter((account) => account.type === "credit_card");
  const liquidAccounts = active.filter(
    (account) => account.type !== "credit_card",
  );
  const archived = accounts.filter((account) => account.is_archived);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billetera</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tus saldos en un solo lugar.
          </p>
        </div>
        {canEdit && (
          <Link
            href="/accounts/new"
            className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Nueva cuenta
          </Link>
        )}
      </header>
      <ExportButtons target="accounts" />
      {active.length === 0 ? (
        <div className="bg-card flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center">
          <Wallet className="text-muted-foreground mb-4 size-10" aria-hidden />
          <h2 className="font-medium">Aún no hay cuentas</h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Agrega efectivo, cuentas bancarias o tarjetas para empezar a seguir
            tus saldos.
          </p>
          {canEdit && (
            <Link
              href="/accounts/new"
              className="text-primary mt-4 text-sm font-medium underline underline-offset-4"
            >
              Crear la primera cuenta
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {cards.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">Tus tarjetas</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Deuda, disponible y próximos cortes.
                </p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {cards.map((account) => (
                  <li key={account.id}>
                    <Link
                      href={`/accounts/${account.id}`}
                      className="bg-card focus-visible:ring-ring hover:bg-accent/40 flex items-center gap-4 overflow-hidden rounded-2xl border p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <div className="w-28 shrink-0 sm:w-36">
                        <CardArtwork account={account} />
                      </div>
                      <span className="flex min-w-0 flex-1 flex-col gap-3">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {account.name}
                          </span>
                          <span className="text-muted-foreground mt-0.5 block text-xs">
                            Tarjeta de crédito
                          </span>
                        </span>
                        <span>
                          <span className="block text-lg font-semibold tabular-nums">
                            {money.format(account.balance)}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            Deuda actual
                          </span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {liquidAccounts.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">Tus cuentas</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Efectivo, bancos, ahorros e inversiones.
                </p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {liquidAccounts.map((account) => {
                  const Icon =
                    account.type === "savings"
                      ? PiggyBank
                      : account.type === "checking"
                        ? Landmark
                        : Wallet;
                  return (
                    <li key={account.id}>
                      <Link
                        href={`/accounts/${account.id}`}
                        className="bg-card focus-visible:ring-ring hover:bg-accent/40 block rounded-2xl border p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className="grid size-10 place-items-center rounded-xl"
                            style={{
                              backgroundColor: `${account.color}22`,
                              color: account.color,
                            }}
                          >
                            <Icon className="size-5" aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {account.name}
                            </span>
                            <span className="text-muted-foreground block text-xs">
                              {typeLabel[account.type]}
                            </span>
                          </span>
                        </span>
                        <span className="mt-5 block text-2xl font-semibold tabular-nums">
                          {money.format(account.balance)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
      {archived.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-medium">
            Archivadas
          </h2>
          <ul className="divide-border divide-y rounded-xl border">
            {archived.map((account) => (
              <li key={account.id}>
                <Link
                  href={`/accounts/${account.id}`}
                  className="hover:bg-accent/40 flex justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span>{account.name}</span>
                  <span className="tabular-nums">
                    {money.format(account.balance)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
