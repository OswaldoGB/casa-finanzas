import DetailPage from "../../../projects/[id]/page";
import { DetailDialog } from "@/components/ui/detail-dialog";

export default function InterceptedDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <DetailDialog title="Detalle del proyecto" wide>
      <DetailPage params={params} />
    </DetailDialog>
  );
}
