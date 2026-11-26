import DetailPage from "../../../accounts/[id]/page";
import { DetailDialog } from "@/components/ui/detail-dialog";

export default function InterceptedDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  return (
    <DetailDialog title="Detalle de cuenta" wide>
      <DetailPage params={params} searchParams={searchParams} />
    </DetailDialog>
  );
}
