import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** /setup solo está disponible mientras no exista ningún perfil. */
export async function hasAnyProfile(): Promise<boolean> {
  const admin = createAdminClient();
  const { count, error } = await admin.from("profiles").select("id", { count: "exact", head: true });
  if (error) throw new Error(`No se pudo consultar perfiles: ${error.message}`);
  return (count ?? 0) > 0;
}
