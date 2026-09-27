import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !serviceKey)
  throw new Error("Faltan llaves para la verificación");

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
const { data: household, error: householdError } = await admin
  .from("households")
  .select("id, name")
  .limit(1)
  .single();
if (householdError) throw householdError;
const { data: adminProfile } = await admin
  .from("profiles")
  .select("id")
  .eq("household_id", household.id)
  .eq("role", "admin")
  .single();
if (!adminProfile) throw new Error("No existe perfil admin");

const email = `phase1-${randomUUID()}@example.invalid`;
const password = `P1-${randomUUID()}!`;
let testUserId;
try {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user)
    throw created.error ?? new Error("No se creó usuario temporal");
  testUserId = created.data.user.id;
  const profile = await admin
    .from("profiles")
    .insert({
      id: testUserId,
      household_id: household.id,
      full_name: "Prueba temporal",
      role: "member",
    });
  if (profile.error) throw profile.error;

  const member = createClient(url, publicKey, {
    auth: { persistSession: false },
  });
  const login = await member.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  const access = (module, level) =>
    member.rpc("has_module_access", {
      requested_module: module,
      required_level: level,
    });
  const initial = await access("dashboard", "view");
  if (initial.error || initial.data !== false)
    throw new Error("El miembro tenía acceso sin asignación");
  const roleChange = await member
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", testUserId);
  if (!roleChange.error) throw new Error("El miembro pudo cambiar su rol");
  const selfGrant = await member.from("module_permissions").insert({
    user_id: testUserId,
    household_id: household.id,
    module: "dashboard",
    level: "edit",
    created_by: testUserId,
  });
  if (!selfGrant.error) throw new Error("El miembro pudo asignarse permisos");
  const grant = await admin.from("module_permissions").insert({
    user_id: testUserId,
    household_id: household.id,
    module: "dashboard",
    level: "view",
    created_by: adminProfile.id,
  });
  if (grant.error) throw grant.error;
  const view = await access("dashboard", "view");
  const edit = await access("dashboard", "edit");
  if (view.error || view.data !== true || edit.error || edit.data !== false)
    throw new Error("Jerarquía de permisos incorrecta");
  const householdUpdate = await member
    .from("households")
    .update({ name: "Cambiado por prueba" })
    .eq("id", household.id)
    .select("id");
  const { data: afterHousehold, error: afterError } = await admin
    .from("households")
    .select("name")
    .eq("id", household.id)
    .single();
  if (
    afterError ||
    householdUpdate.data?.length ||
    afterHousehold?.name !== household.name
  ) {
    throw new Error("El miembro pudo editar el hogar");
  }
  console.log(
    "Verificación Supabase: bloqueo por defecto, rol, hogar, autoasignación y niveles correctos",
  );
} finally {
  if (testUserId) {
    const deleted = await admin.auth.admin.deleteUser(testUserId);
    if (deleted.error)
      throw new Error(
        "No se pudo eliminar el usuario temporal: " + deleted.error.message,
      );
  }
}
