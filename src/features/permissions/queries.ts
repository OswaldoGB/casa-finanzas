import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { canAccess, type ModuleName, type PermissionMap } from "./modules";

// cache(): layout, página y cada query comparten una sola resolución por request.
export const getAccess = cache(async function getAccess() {
  const supabase = await createClient();
  const { data: claims, error: authError } = await supabase.auth.getClaims();
  if (authError || !claims?.claims.sub) redirect("/login");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, household_id, full_name, role")
    .eq("id", claims.claims.sub)
    .single();
  if (profileError || !profile) redirect("/login?error=profile");

  let permissions: PermissionMap = {};
  if (profile.role === "member") {
    const { data, error } = await supabase
      .from("module_permissions")
      .select("module, level")
      .eq("user_id", profile.id);
    if (error) throw new Error("No se pudieron cargar los permisos.");
    permissions = Object.fromEntries(
      (data ?? []).map(({ module, level }) => [module, level]),
    );
  }
  const accent: unknown = claims.claims.user_metadata?.accent;
  return { supabase, profile, permissions, accent };
});

export async function requireAdmin() {
  const access = await getAccess();
  if (access.profile.role !== "admin") redirect("/access-pending");
  return access;
}

export async function requireModule(
  module: ModuleName,
  level: "view" | "edit" = "view",
) {
  const access = await getAccess();
  if (!canAccess(access.profile.role, access.permissions, module, level))
    redirect("/access-pending");
  return access;
}
