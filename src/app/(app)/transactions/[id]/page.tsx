import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTransaction,
  getTransactionOptions,
} from "@/features/transactions/queries";
import { TransactionForm } from "@/features/transactions/components/transaction-form";
import { DeleteButton } from "@/features/transactions/components/delete-button";
import { getAttachments } from "@/features/attachments/queries";
import { AttachmentsPanel } from "@/features/attachments/components/attachments-panel";

export const metadata = { title: "Movimiento" };
export default async function TransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [result, options, attachments] = await Promise.all([
    getTransaction(id),
    getTransactionOptions(),
    getAttachments(id),
  ]);
  if (!result?.transaction) notFound();
  const transaction = result.transaction;
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link
        href="/transactions"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Movimientos
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Movimiento</h1>
        {result.canEdit && <DeleteButton id={id} />}
      </div>
      {transaction.status === "pending" && (
        <p className="rounded-lg border px-3 py-2 text-sm">
          Este movimiento recurrente está pendiente. Confírmalo en la lista para
          editarlo.
        </p>
      )}
      {result.canEdit &&
      transaction.status === "posted" &&
      ["income", "expense", "transfer"].includes(transaction.type) ? (
        <TransactionForm transaction={transaction} options={options} />
      ) : (
        <dl className="bg-card grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm">
          <dt>Tipo</dt>
          <dd>{transaction.type}</dd>
          <dt>Monto</dt>
          <dd>{transaction.amount}</dd>
          <dt>Fecha</dt>
          <dd>{transaction.date}</dd>
          <dt>Descripción</dt>
          <dd>{transaction.description}</dd>
        </dl>
      )}
      <AttachmentsPanel
        transactionId={id}
        initialAttachments={attachments}
        canEdit={result.canEdit}
      />
    </div>
  );
}
