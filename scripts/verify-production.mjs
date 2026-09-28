import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import ExcelJS from "exceljs";

const prod = parseEnv(readFileSync(".env.production.local", "utf8"));
const site = "https://casa-finanzas-six.vercel.app";
assert.equal(prod.NEXT_PUBLIC_SITE_URL, site);
assert.equal(
  prod.NEXT_PUBLIC_SUPABASE_URL,
  "https://wmbudntitrkgrqptlyvc.supabase.co",
);
assert(
  !process.argv.slice(2).some((arg) => arg !== "--authenticated"),
  "Solo se admite --authenticated.",
);
const request = (path, headers = {}) =>
  fetch(`${site}${path}`, { headers, redirect: "manual" });
for (const path of ["/dashboard", "/api/backup", "/setup"]) {
  const response = await request(path);
  assert(
    [302, 303, 307, 308].includes(response.status),
    `La ruta privada ${path} no redirigió.`,
  );
  assert.match(response.headers.get("location"), /\/login/);
}
const login = await request("/login");
assert.equal(login.status, 200, "Login no disponible públicamente.");
assert.match(await login.text(), /Iniciar sesión/);
const manifest = await request("/manifest.webmanifest");
assert.equal(manifest.status, 200);
assert.equal((await manifest.json()).name, "Casa & Finanzas");
assert.equal((await request("/icons/app-192.png")).status, 200);
assert.equal((await request("/api/cron/recurring")).status, 401);
assert.equal(
  (await request("/api/cron/recurring", { authorization: "Bearer incorrecto" }))
    .status,
  401,
);
const settings = await fetch(
  `${prod.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
  { headers: { apikey: prod.NEXT_PUBLIC_SUPABASE_ANON_KEY } },
);
assert.equal(settings.status, 200);
const authSettings = await settings.json();
assert.equal(
  authSettings.external.email,
  true,
  "Acceso por correo deshabilitado.",
);
assert.equal(
  authSettings.disable_signup,
  true,
  "El registro público debe estar cerrado.",
);
const anonymous = createClient(
  prod.NEXT_PUBLIC_SUPABASE_URL,
  prod.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);
const publicProfiles = await anonymous.from("profiles").select("id");
assert(
  publicProfiles.error || publicProfiles.data.length === 0,
  "RLS expuso perfiles anónimos.",
);
for (const table of ["card_installment_plans", "card_payments"]) {
  const response = await anonymous.from(table).select("id");
  assert(
    !response.error || response.error.code === "42501",
    `Falta el esquema de tarjetas: ${table}.`,
  );
  assert(response.error || response.data.length === 0, `RLS expuso ${table}.`);
}

if (process.argv.includes("--authenticated")) {
  const access = parseEnv(readFileSync(".env.production-access.local", "utf8"));
  const cookies = new Map();
  const client = createServerClient(
    prod.NEXT_PUBLIC_SUPABASE_URL,
    prod.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
        setAll: (values) =>
          values.forEach(({ name, value }) => cookies.set(name, value)),
      },
    },
  );
  const signed = await client.auth.signInWithPassword({
    email: access.ADMIN_EMAIL,
    password: access.ADMIN_PASSWORD,
  });
  assert(
    !signed.error,
    "No se pudo verificar el acceso inicial recién creado.",
  );
  try {
    const headers = () => ({
      cookie: [...cookies]
        .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
        .join("; "),
    });
    for (const path of [
      "dashboard",
      "accounts",
      "transactions",
      "budgets",
      "projections",
      "reports",
      "inventory",
      "shopping",
      "lists",
      "projects",
      "loans",
      "savings",
      "settings",
    ]) {
      const response = await request(`/${path}`, headers());
      assert.equal(response.status, 200, `No se pudo abrir ${path}.`);
      const html = await response.text();
      assert(
        !html.includes(prod.SUPABASE_SERVICE_ROLE_KEY),
        "Una respuesta expuso la llave privada.",
      );
      assert(
        !html.includes(access.ADMIN_PASSWORD),
        "Una respuesta expuso la contraseña inicial.",
      );
    }
    const backup = await request("/api/backup", headers());
    assert.equal(backup.status, 200);
    assert.match(backup.headers.get("cache-control"), /no-store/);
    const data = await backup.json();
    assert.equal(data.version, 1);
    assert(
      Array.isArray(data.tables.attachments),
      "Falta metadata de comprobantes en el respaldo.",
    );
    assert(
      Array.isArray(data.tables.card_installment_plans) &&
        Array.isArray(data.tables.card_payments),
      "Faltan planes y pagos de tarjetas en el respaldo.",
    );
    const serialized = JSON.stringify(data);
    assert(
      !serialized.includes(prod.SUPABASE_SERVICE_ROLE_KEY) &&
        !serialized.includes(access.ADMIN_PASSWORD),
      "Respaldo contiene secretos.",
    );
    const excel = await request(
      "/api/backup?format=xlsx&month=2026-09",
      headers(),
    );
    assert.equal(excel.status, 200);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await excel.arrayBuffer()));
    assert.equal(workbook.worksheets.length, 11);
    const csv = await request(
      "/api/export?table=categories&format=csv",
      headers(),
    );
    assert.equal(csv.status, 200);
    assert.match(await csv.text(), /Salario/);
    const cron = await request("/api/cron/recurring", {
      authorization: `Bearer ${prod.CRON_SECRET}`,
    });
    assert.equal(cron.status, 200);
    assert.equal(typeof (await cron.json()).created, "number");
  } finally {
    await client.auth.signOut({ scope: "local" });
  }
}
console.log(
  `PASS producción: HTTPS/login, rutas privadas, setup cerrado, manifest/íconos, registro cerrado, RLS y cron protegido${process.argv.includes("--authenticated") ? ", acceso inicial, 13 módulos, JSON y Excel mensual de 11 hojas" : ""}. No se crean registros de prueba.`,
);
