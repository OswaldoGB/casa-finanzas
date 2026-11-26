import DetailPage from "../../../trips/[id]/page";
import { DetailDialog } from "@/components/ui/detail-dialog";

export default function InterceptedDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <DetailDialog title="Detalle del viaje" wide>
      <DetailPage params={params} />
    </DetailDialog>
  );
}
