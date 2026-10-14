import Link from "next/link";
import { formatUSD } from "@/lib/format";
import type { ShoppingPurchase } from "../queries";
export function PurchaseHistory({
  purchases,
  transactions,
  canViewTransaction,
}: {
  purchases: ShoppingPurchase[];
  transactions: { id: string; amount: number; date: string }[];
  canViewTransaction: boolean;
}) {
  if (!purchases.length) return null;
  const map = new Map(transactions.map((t) => [t.id, t]));
  return (
    <section className="bg-card rounded-2xl border p-5">
      <h2 className="mb-3 font-semibold">Compras registradas</h2>
      <div className="divide-y">
        {purchases.map((p) => {
          const tx = map.get(p.transaction_id);
          return (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {p.store_name || "Por decidir"}
                </p>
                <p className="text-muted-foreground text-xs">{tx?.date}</p>
                {canViewTransaction && (
                  <Link
                    href={`/transactions/${p.transaction_id}`}
                    className="text-primary text-xs underline"
                  >
                    Ver movimiento y comprobante
                  </Link>
                )}
              </div>
              <strong>{tx ? formatUSD(tx.amount) : "—"}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
