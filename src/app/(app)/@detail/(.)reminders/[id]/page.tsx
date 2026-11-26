import DetailPage from "../../../reminders/[id]/page";
import { DetailDialog } from "@/components/ui/detail-dialog";

export default function InterceptedDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <DetailDialog title="Detalle del recordatorio" wide>
      <DetailPage params={params} />
    </DetailDialog>
  );
}
