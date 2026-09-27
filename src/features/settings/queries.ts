import "server-only";
import { requireAdmin } from "@/features/permissions/queries";
import type { PermissionMap } from "@/features/permissions/modules";

export async function getSettings() {
  const { supabase, profile } = await requireAdmin();
  const [householdResult, membersResult, permissionsResult] = await Promise.all(
    [
      supabase
        .from("households")
        .select("id, name, timezone")
        .eq("id", profile.household_id)
        .single(),
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("household_id", profile.household_id)
        .order("created_at"),
      supabase
        .from("module_permissions")
        .select("user_id, module, level")
        .eq("household_id", profile.household_id),
    ],
  );
  if (
    householdResult.error ||
    membersResult.error ||
    permissionsResult.error ||
    !householdResult.data
  ) {
    throw new Error("No se pudo cargar la configuración del hogar.");
  }
  const member =
    membersResult.data.find((person) => person.role === "member") ?? null;
  const permissions: PermissionMap = Object.fromEntries(
    (permissionsResult.data ?? [])
      .filter((entry) => entry.user_id === member?.id)
      .map(({ module, level }) => [module, level]),
  );
  return {
    household: householdResult.data,
    members: membersResult.data,
    member,
    permissions,
  };
}
