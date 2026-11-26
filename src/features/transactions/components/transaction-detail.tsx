import { readPurchaseItems, purchaseTotalCents } from "../purchase-items";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTransaction,
  getTransactionOptions,
} from "@/features/transactions/queries";
import { TransactionDialog } from "@/features/transactions/components/transaction-dialog";
import { DeleteButton } from "@/features/transactions/components/delete-button";
import { getAttachments } from "@/features/attachments/queries";
import { AttachmentsPanel } from "@/features/attachments/components/attachments-panel";
import {
  loanRepaymentSummary,
  linkedRecordLabel,
  transactionTypeLabel,
} from "@/features/transactions/details";
import { formatUSD } from "@/lib/format";
import { TransactionTravelSource } from "@/features/trips/components/transaction-source";

type TransactionSource = {
  type: "shopping_list" | "shopping_item" | "inventory_item";
  href: string;
  name: string;
  detail: string;
};
export async function TransactionDetail({
  id,
  modal = false,
}: {
  id: string;
  modal?: boolean;
}) {
  const [result, options, attachments] = await Promise.all([
    getTransaction(id),
    getTransactionOptions(),
    getAttachments(id),
  ]);
  if (!result?.transaction) notFound();
  const transaction = result.transaction;
  const purchaseItems = readPurchaseItems(transaction.purchase_items);
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
    result.sources.shoppingList && !result.travelSource?.purchase
      ? {
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
        }
      : null,
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
      {!modal && (
        <Link
          href="/transactions"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Movimientos
        </Link>
      )}
      <div className="flex items-center justify-between gap-2">
        {modal ? (
          <span />
        ) : (
          <h1 className="text-2xl font-semibold">Movimiento</h1>
        )}
        <div className="flex items-center gap-2">
          {result.canEdit &&
            !transaction.card_payment_id &&
            transaction.status === "posted" &&
            ["income", "expense", "transfer"].includes(transaction.type) && (
              <TransactionDialog options={options} transaction={transaction} />
            )}
          {result.canEdit && !transaction.card_payment_id && (
            <DeleteButton id={id} />
          )}
        </div>
      </div>
      {transaction.card_payment_id && (
        <Link
          href={`/accounts/${transaction.destination_account_id}?section=history`}
          className="text-primary block rounded-xl border p-4 text-sm"
        >
          Este movimiento es parte de un pago de tarjeta. Consulta sus cuentas,
          cortes y corrige el pago completo en el historial de la tarjeta →
        </Link>
      )}
      {transaction.status === "pending" && (
        <p className="rounded-lg border px-3 py-2 text-sm">
          Este movimiento recurrente está pendiente. Confírmalo en la lista para
          editarlo.
        </p>
      )}
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
      <TransactionTravelSource
        source={result.travelSource}
        canViewProjects={result.canViewProjects}
        canViewLists={result.canViewLists}
        amount={Number(transaction.amount)}
      />
      {(transaction.purchase_place || purchaseItems.length > 0) && (
        <section className="bg-card min-w-0 space-y-3 rounded-xl border p-4">
          <h2 className="font-semibold">Detalle de compra</h2>
          {transaction.purchase_place && (
            <p className="text-sm break-words">{transaction.purchase_place}</p>
          )}
          {purchaseItems.length > 0 && (
            <ul className="divide-y">
              {purchaseItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-2 text-sm"
                >
                  <div className="min-w-0 break-words">
                    {item.name}
                    <p className="text-muted-foreground text-xs">
                      {item.quantity} × {formatUSD(item.unitCents / 100)}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium">
                    {formatUSD(purchaseTotalCents(item) / 100)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {transaction.type === "loan_repayment" && (
        <section className="bg-card space-y-2 rounded-xl border p-4 text-sm">
          <h2 className="font-semibold">Registro del abono</h2>
          <p>
            Registrado el{" "}
            <time dateTime={transaction.created_at}>
              {new Intl.DateTimeFormat("es-SV", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: options.timezone,
              }).format(new Date(transaction.created_at))}
            </time>
          </p>
          {result.repaymentItems.map(
            ({ loan_item_id, loan_purchase_items: item, amount_cents }) => (
              <div
                key={loan_item_id}
                className="flex justify-between gap-3 border-t pt-2"
              >
                {item && (
                  <Link
                    href={`/transactions/${item.purchase_id}`}
                    className="text-primary min-w-0 break-words hover:underline"
                  >
                    {item.name}
                  </Link>
                )}
                <span className="shrink-0">
                  {formatUSD(amount_cents / 100)}
                </span>
              </div>
            ),
          )}
        </section>
      )}
      {result.loanItems.length > 0 && (
        <section className="bg-card space-y-2 rounded-xl border p-4 text-sm">
          <h2 className="font-semibold">Compras vinculadas</h2>
          {result.loanItems.map((item) => (
            <div
              key={item.id}
              className="flex justify-between gap-3 border-t pt-2"
            >
              <Link
                href={`/transactions/${item.purchase_id}`}
                className="text-primary min-w-0 break-words hover:underline"
              >
                {item.quantity} × {item.name}
              </Link>
              <span className="shrink-0">
                {formatUSD((item.quantity * item.unit_cents) / 100)}
              </span>
            </div>
          ))}
        </section>
      )}
      <AttachmentsPanel
        transactionId={id}
        initialAttachments={attachments}
        canEdit={result.canEdit}
      />
    </div>
  );
}
