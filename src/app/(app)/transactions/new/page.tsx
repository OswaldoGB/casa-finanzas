import Link from "next/link";
import { getTransactionOptions } from "@/features/transactions/queries";
import { TransactionForm } from "@/features/transactions/components/transaction-form";

export const metadata = { title: "Nuevo movimiento" };
export default async function NewTransactionPage() {
  const options = await getTransactionOptions();
  if (!options.canEdit)
    return <p>No tienes permiso para registrar movimientos.</p>;
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link
        href="/transactions"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Movimientos
      </Link>
      <h1 className="text-2xl font-semibold">Nuevo movimiento</h1>
      <TransactionForm options={options} rememberDefaults />
    </div>
  );
}
