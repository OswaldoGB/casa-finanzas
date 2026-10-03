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
  linkedRecordLabel,
  transactionTypeLabel,
} from "@/features/transactions/details";
import { formatUSD } from "@/lib/format";

export const metadata = { title: "Movimiento" };
type TransactionSource = {
  type: "shopping_list" | "shopping_item" | "inventory_item";
  href: string;
  name: string;
  detail: string;
};
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
  const destinationAccount = options.accounts.find(
    (account) => account.id === transaction.destination_account_id,
  );
  const category = options.categories.find(
    (item) => item.id === transaction.category_id,
  );
  const method = options.methods.find(
    (item) => item.id === transaction.payment_method_id,
  );
  const project = options.projects.find(
    (item) => item.id === transaction.project_id,
  );
  const author = options.members.find(
    (member) => member.id === transaction.created_by,
  );
  const sources = [
    result.sources.shoppingList && {
      type: "shopping_list" as const,
      href: `/lists/${result.sources.shoppingList.id}`,
      name: result.sources.shoppingList.name,
      detail: [
        result.sources.shoppingList.store,
        result.sources.shoppingList.status === "open"
          ? "Abierta"
          : "Completada",
      ]
        .filter(Boolean)
        .join(" · "),
    },
    result.sources.shoppingItem && {
      type: "shopping_item" as const,
      href: "/shopping",
      name: result.sources.shoppingItem.name,
      detail:
        result.sources.shoppingItem.status === "bought"
          ? "Comprada"
          : "Pendiente",
    },
    result.sources.inventoryItem && {
      type: "inventory_item" as const,
      href: `/inventory/${result.sources.inventoryItem.id}`,
      name: result.sources.inventoryItem.name,
      detail: result.sources.inventoryItem.location || "Sin ubicación",
    },
  ].filter((source): source is TransactionSource => source !== null);
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
      <section
        className="bg-card rounded-xl border p-4 text-sm"
        aria-labelledby="traceability-title"
      >
        <h2 id="traceability-title" className="font-semibold">
          Trazabilidad
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <dt>Registrado por</dt>
          <dd>{author?.full_name ?? "Usuario del hogar"}</dd>
          {depositAccount && (
            <>
              <dt>
                {transaction.type === "loan_repayment"
                  ? "Depositado en"
                  : "Cuenta de origen"}
              </dt>
              <dd>{depositAccount.name}</dd>
            </>
          )}
          {destinationAccount && (
            <>
              <dt>Cuenta de destino</dt>
              <dd>{destinationAccount.name}</dd>
            </>
          )}
          {category && (
            <>
              <dt>Categoría</dt>
              <dd>{category.name}</dd>
            </>
          )}
          {method && (
            <>
              <dt>Método de pago</dt>
              <dd>{method.name}</dd>
            </>
          )}
          {project && (
            <>
              <dt>Proyecto</dt>
              <dd>{project.name}</dd>
            </>
          )}
        </dl>
        {sources.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Registro que originó este movimiento
            </p>
            <ul className="mt-2 space-y-2">
              {sources.map((source) => (
                <li key={source.type}>
                  <Link
                    href={source.href}
                    className="text-primary hover:underline"
                  >
                    {linkedRecordLabel(source.type)}: {source.name}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {source.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <AttachmentsPanel
        transactionId={id}
        initialAttachments={attachments}
        canEdit={result.canEdit}
      />
    </div>
  );
}
