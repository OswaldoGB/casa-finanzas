import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import { projectSnapshotSchema } from "./schemas";

export async function getProjects() {
  const { supabase, profile, permissions } = await requireModule("projects");
  const result = await supabase.rpc("project_snapshot");
  const parsed = projectSnapshotSchema.safeParse(result.data);
  if (result.error || !parsed.success)
    throw new Error("No se pudieron cargar los proyectos.");
  return {
    projects: parsed.data,
    canEdit: canAccess(profile.role, permissions, "projects", "edit"),
  };
}
