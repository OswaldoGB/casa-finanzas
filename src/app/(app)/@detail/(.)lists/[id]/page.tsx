import DetailPage from "../../../lists/[id]/page";
import { DetailDialog } from "@/components/ui/detail-dialog";

export default function InterceptedDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <DetailDialog title="Detalle de lista" wide>
      <DetailPage params={params} />
    </DetailDialog>
  );
}
