import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import { projectSnapshotSchema } from "./schemas";

export async function getProjects() {
  const { supabase, profile, permissions } = await requireModule("projects");
  const [result, trips] = await Promise.all([
    supabase.rpc("project_snapshot"),
    supabase
      .from("trip_details")
      .select("project_id")
      .eq("household_id", profile.household_id),
  ]);
  const parsed = projectSnapshotSchema.safeParse(result.data);
  if (result.error || trips.error || !parsed.success)
    throw new Error("No se pudieron cargar los proyectos.");
  return {
    projects: parsed.data.map((p) => ({
      ...p,
      isTrip: (trips.data ?? []).some((t) => t.project_id === p.id),
    })),
    canEdit: canAccess(profile.role, permissions, "projects", "edit"),
  };
}
