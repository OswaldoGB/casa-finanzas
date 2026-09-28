import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { projectionInputSchema } from "./schemas";
export async function getProjectionInputs() {
  const { supabase } = await requireModule("projections");
  const { data, error } = await supabase.rpc("projection_inputs", {
    p_months: 12,
  });
  if (error) throw new Error("No se pudo cargar la proyección de efectivo.");
  return projectionInputSchema.parse(data);
}
