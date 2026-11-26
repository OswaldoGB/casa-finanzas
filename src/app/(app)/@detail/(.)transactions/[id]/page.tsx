import { TransactionDetail } from "@/features/transactions/components/transaction-detail";
import { DetailDialog } from "@/components/ui/detail-dialog";

export default async function InterceptedTransaction({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <DetailDialog>
      <TransactionDetail id={(await params).id} modal />
    </DetailDialog>
  );
}
