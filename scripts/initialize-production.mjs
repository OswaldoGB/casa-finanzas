import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

if (process.argv.includes("--help")) {
  console.log(
    "Inicializa exclusivamente el proyecto nuevo de producción, antes de publicar. Requiere --confirmar y archivos .env.local/.env.production.local. Conserva nombre/correo/zona del admin de desarrollo, sin copiar movimientos. Guarda la contraseña inicial en .env.production-access.local, excluido de Git. Rechaza proyectos ya configurados.",
  );
  process.exit(0);
}
assert.deepEqual(
  process.argv.slice(2),
  ["--confirmar"],
  "Se requiere --confirmar.",
);
const dev = parseEnv(readFileSync(".env.local", "utf8"));
const prod = parseEnv(readFileSync(".env.production.local", "utf8"));
assert.match(
  dev.NEXT_PUBLIC_SUPABASE_URL ?? "",
  /^https:\/\/.+\.supabase\.co$/,
);
assert.match(
  prod.NEXT_PUBLIC_SUPABASE_URL ?? "",
  /^https:\/\/.+\.supabase\.co$/,
);
assert.notEqual(dev.NEXT_PUBLIC_SUPABASE_URL, prod.NEXT_PUBLIC_SUPABASE_URL);
assert.match(prod.NEXT_PUBLIC_SITE_URL ?? "", /^https:\/\/[^/]+$/);
assert(
  !existsSync(".env.production-access.local"),
  "Ya existe el archivo de acceso; no se reemplaza.",
);
const options = { auth: { persistSession: false } };
const source = createClient(
  dev.NEXT_PUBLIC_SUPABASE_URL,
  dev.SUPABASE_SERVICE_ROLE_KEY,
  options,
);
const destination = createClient(
  prod.NEXT_PUBLIC_SUPABASE_URL,
  prod.SUPABASE_SERVICE_ROLE_KEY,
  options,
);
const checked = (result) => {
  if (result.error) throw new Error(result.error.message);
  return result.data;
};

const { count, error } = await destination
  .from("profiles")
  .select("id", { count: "exact", head: true });
if (error) throw new Error(error.message);
assert.equal(count, 0, "Producción ya tiene perfiles; no se modifica.");
assert.equal(
  checked(await destination.auth.admin.listUsers()).users.length,
  0,
  "Producción ya tiene usuarios; no se modifica.",
);
const buckets = checked(await destination.storage.listBuckets());
for (const id of ["receipts", "inventory"])
  assert(
    buckets.some((bucket) => bucket.id === id && !bucket.public),
    "Falta un bucket privado.",
  );
const owner = checked(
  await source
    .from("profiles")
    .select("id,full_name,household_id")
    .eq("role", "admin")
    .single(),
);
const home = checked(
  await source
    .from("households")
    .select("name,timezone")
    .eq("id", owner.household_id)
    .single(),
);
const email = checked(await source.auth.admin.getUserById(owner.id)).user.email;
assert(email, "Falta el correo del administrador.");
const password = randomBytes(24).toString("base64url") + "aA1!";
writeFileSync(
  ".env.production-access.local",
  `ADMIN_EMAIL=${email}\nADMIN_PASSWORD=${password}\nSIGN_IN_URL=${prod.NEXT_PUBLIC_SITE_URL}/login\nCHANGE_PASSWORD_URL=${prod.NEXT_PUBLIC_SITE_URL}/reset-password\n`,
  { flag: "wx", mode: 0o600 },
);
let userId,
  householdId,
  complete = false;
try {
  userId = checked(
    await destination.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    }),
  ).user.id;
  householdId = checked(
    await destination
      .from("households")
      .insert({ name: home.name, timezone: home.timezone })
      .select("id")
      .single(),
  ).id;
  checked(
    await destination.from("profiles").insert({
      id: userId,
      household_id: householdId,
      full_name: owner.full_name,
      role: "admin",
    }),
  );
  complete = true;
  console.log(
    "Administrador de producción inicializado. Contraseña inicial guardada únicamente en .env.production-access.local; no se muestra. No se copiaron movimientos ni cuentas financieras de desarrollo.",
  );
} finally {
  if (!complete) {
    if (userId) checked(await destination.auth.admin.deleteUser(userId));
    if (householdId)
      checked(
        await destination.from("households").delete().eq("id", householdId),
      );
  }
}
