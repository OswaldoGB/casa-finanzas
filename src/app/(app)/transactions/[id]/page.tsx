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
import {
  loanRepaymentSummary,
  transactionTypeLabel,
} from "@/features/transactions/details";
import { formatUSD } from "@/lib/format";

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
  const repayment =
    transaction.type === "loan_repayment" && result.loan
      ? loanRepaymentSummary(result.loan)
      : null;
  const depositAccount = options.accounts.find(
    (account) => account.id === transaction.account_id,
  );
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
          <dd>{transactionTypeLabel(transaction.type)}</dd>
          <dt>Monto</dt>
          <dd>{formatUSD(Number(transaction.amount))}</dd>
          <dt>Fecha</dt>
          <dd>{transaction.date}</dd>
          <dt>Descripción</dt>
          <dd>{transaction.description}</dd>
          {repayment && (
            <>
              <dt>Préstamo original</dt>
              <dd>
                <Link
                  className="text-primary underline"
                  href={`/loans#${transaction.loan_id}`}
                >
                  Préstamo a {repayment.debtor}
                </Link>
              </dd>
              <dt>Monto prestado</dt>
              <dd>{formatUSD(repayment.lent)}</dd>
              <dt>Recuperado hasta hoy</dt>
              <dd>{formatUSD(repayment.recovered)}</dd>
              <dt>Saldo pendiente</dt>
              <dd>{formatUSD(repayment.pending)}</dd>
              <dt>Fecha del préstamo</dt>
              <dd>{repayment.date}</dd>
              {repayment.expectedPaymentDate && (
                <>
                  <dt>Pago esperado</dt>
                  <dd>{repayment.expectedPaymentDate}</dd>
                </>
              )}
              {depositAccount && (
                <>
                  <dt>Depositado en</dt>
                  <dd>{depositAccount.name}</dd>
                </>
              )}
            </>
          )}
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
