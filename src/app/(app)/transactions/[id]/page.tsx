import { TransactionDetail } from "@/features/transactions/components/transaction-detail";

export const metadata = { title: "Movimiento" };

export default async function TransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <TransactionDetail id={(await params).id} />;
}
