import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import ExcelJS from "exceljs";
import { assertTestProject } from "./assert-test-project.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.doesNotThrow(() => assertTestProject(url), "Solo desarrollo.");
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const checked = (result) => {
  if (result.error) throw result.error;
  return result.data;
};
const cookies = new Map();
const member = createServerClient(
  url,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (values) =>
        values.forEach(({ name, value }) => cookies.set(name, value)),
    },
  },
);
const request = (path) =>
  fetch(`http://localhost:3000${path}`, {
    headers: {
      cookie: [...cookies]
        .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
        .join("; "),
    },
    redirect: "manual",
  });
let userId, accountId, categoryId;
const transactionIds = [];
try {
  const owner = checked(
    await admin
      .from("profiles")
      .select("id,household_id")
      .eq("role", "admin")
      .single(),
  );
  const household = owner.household_id;
  const members = checked(
    await admin
      .from("profiles")
      .select("id")
      .eq("household_id", household)
      .eq("role", "member"),
  );
  assert.equal(members.length, 0, "No se modifican miembros existentes.");
  const email = `exports-${randomUUID()}@example.com`,
    password = `${randomUUID()}Aa1!`;
  userId = checked(
    await admin.auth.admin.createUser({ email, password, email_confirm: true }),
  ).user.id;
  checked(
    await admin.from("profiles").insert({
      id: userId,
      household_id: household,
      role: "member",
      full_name: "Prueba temporal exportación",
    }),
  );
  checked(await member.auth.signInWithPassword({ email, password }));
  const base = { household_id: household, created_by: owner.id };
  accountId = checked(
    await admin
      .from("accounts")
      .insert({
        ...base,
        name: "Exportación temporal",
        type: "checking",
        opening_balance: 10,
      })
      .select("id")
      .single(),
  ).id;
  categoryId = checked(
    await admin
      .from("categories")
      .insert({
        ...base,
        name: "Exportación temporal",
        type: "income",
        color: "#10b981",
        icon: "tag",
      })
      .select("id")
      .single(),
  ).id;
  const permit = (module, level) =>
    admin
      .from("module_permissions")
      .upsert({ ...base, user_id: userId, module, level })
      .then(checked);
  assert.equal((await request("/api/export?table=accounts")).status, 403);
  assert.equal((await request("/api/backup")).status, 403);
  assert.equal((await request("/api/export?table=categories")).status, 403);
  await permit("reports", "view");
  assert.equal(
    (await request("/api/export?table=accounts")).status,
    403,
    "Permiso compartido de catálogo no autoriza exportar cuentas.",
  );
  assert.equal(
    (await request("/api/export?table=reports&format=xlsx")).status,
    200,
  );
  await permit("accounts", "view");
  const accountCsv = await request("/api/export?table=accounts&format=csv");
  assert.equal(accountCsv.status, 200);
  assert.match(await accountCsv.text(), /Exportación temporal/);
  assert.match(accountCsv.headers.get("cache-control"), /no-store/);
  await permit("transactions", "view");
  const prefix = `Export-check-${randomUUID()}`;
  // Más de una página del límite normal de Supabase.
  for (let offset = 0; offset < 1001; offset += 200) {
    const rows = Array.from(
      { length: Math.min(200, 1001 - offset) },
      (_, i) => ({
        ...base,
        account_id: accountId,
        category_id: categoryId,
        type: "income",
        status: "posted",
        date: "2026-09-01",
        amount: 1,
        description: `${prefix}-${offset + i}`,
      }),
    );
    transactionIds.push(
      ...checked(
        await admin.from("transactions").insert(rows).select("id"),
      ).map((row) => row.id),
    );
  }
  const params = new URLSearchParams({
    table: "transactions",
    account: accountId,
    q: prefix,
    from: "2026-09-01",
    to: "2026-09-01",
  });
  const csv = await request(`/api/export?${params}&format=csv`);
  assert.equal(csv.status, 200);
  const csvBody = await csv.text();
  assert.match(csvBody, /"cuenta"/);
  assert.match(csvBody, /Exportación temporal/);
  assert.equal(
    csvBody.split("\r\n").length - 1,
    1001,
    "La exportación no trunca 1000 filas.",
  );
  const excel = await request(`/api/export?${params}&format=xlsx`);
  assert.equal(excel.status, 200);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await excel.arrayBuffer()));
  assert.equal(workbook.worksheets[0].rowCount, 1002);
  params.set("from", "2026-09-02");
  const empty = await request(`/api/export?${params}&format=csv`);
  assert.equal(empty.status, 200);
  assert.equal((await empty.text()).replace(/^\uFEFF/, ""), "");
  assert.equal(
    (await request("/api/export?table=list_items&list=bad")).status,
    403,
  );
  await permit("shopping_lists", "view");
  assert.equal(
    (await request("/api/export?table=list_items&list=bad")).status,
    400,
  );
  const search = await request(`/api/search?q=${encodeURIComponent(prefix)}`);
  assert.equal(search.status, 200);
  assert.equal((await search.json()).results.length, 6);
  await permit("transactions", "none");
  assert.equal((await request("/api/export?table=transactions")).status, 403);
  assert.equal(
    (
      await (
        await request(`/api/search?q=${encodeURIComponent(prefix)}`)
      ).json()
    ).results.length,
    0,
  );
  console.log(
    "PASS: permisos de descargas/búsqueda, filtros, 1001 filas CSV/Excel y bloqueo del respaldo para miembros.",
  );
} finally {
  for (let offset = 0; offset < transactionIds.length; offset += 200)
    checked(
      await admin
        .from("transactions")
        .delete()
        .in("id", transactionIds.slice(offset, offset + 200)),
    );
  if (accountId)
    checked(await admin.from("accounts").delete().eq("id", accountId));
  if (categoryId)
    checked(await admin.from("categories").delete().eq("id", categoryId));
  if (userId) checked(await admin.auth.admin.deleteUser(userId));
}
