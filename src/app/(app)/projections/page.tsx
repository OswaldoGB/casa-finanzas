import { getProjectionInputs } from "@/features/projections/queries";
import { ProjectionView } from "@/features/projections/components/projection-view";
export const metadata = { title: "Proyecciones" };
export default async function ProjectionsPage() {
  return <ProjectionView input={await getProjectionInputs()} />;
}
