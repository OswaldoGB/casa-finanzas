import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url !== "https://rtqqmmahfdwcnaydrhhc.supabase.co")
  throw new Error("Esta prueba solo se permite en el proyecto de desarrollo.");
const options = { auth: { persistSession: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const member = createClient(
  url,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  options,
);
const data = (result) => {
  if (result.error) throw result.error;
  return result.data;
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
let userId, categoryId, accountId;
try {
  const owner = data(
    await admin
      .from("profiles")
      .select("id,household_id")
      .eq("role", "admin")
      .single(),
  );
  const household = owner.household_id;
  assert(
    data(
      await admin
        .from("profiles")
        .select("id")
        .eq("household_id", household)
        .eq("role", "member"),
    ).length === 0,
    "La prueba requiere el espacio de miembro vacío; no modifica un miembro existente.",
  );
  const email = `phase4-${randomUUID()}@example.com`;
  const password = `${randomUUID()}Aa1!`;
  userId = data(
    await admin.auth.admin.createUser({ email, password, email_confirm: true }),
  ).user.id;
  data(
    await admin
      .from("profiles")
      .insert({
        id: userId,
        household_id: household,
        full_name: "Prueba de presupuestos",
        role: "member",
      }),
  );
  categoryId = data(
    await admin
      .from("categories")
      .insert({
        household_id: household,
        created_by: owner.id,
        name: "Presupuesto temporal",
        type: "expense",
      })
      .select("id")
      .single(),
  ).id;
  accountId = data(
    await admin
      .from("accounts")
      .insert({
        household_id: household,
        created_by: owner.id,
        name: "Presupuesto temporal",
        type: "checking",
        opening_balance: 500,
      })
      .select("id")
      .single(),
  ).id;
  data(await member.auth.signInWithPassword({ email, password }));
  const budget = {
    household_id: household,
    created_by: owner.id,
    category_id: categoryId,
    amount: 100,
    carry_over: true,
  };
  const permission = {
    user_id: userId,
    household_id: household,
    created_by: owner.id,
  };
  const permit = async (module, level) =>
    data(
      await admin
        .from("module_permissions")
        .upsert({ ...permission, module, level }),
    );
  const snapshot = async (month, module = "budgets") =>
    data(
      await member.rpc("budget_snapshot", { p_month: month, p_module: module }),
    ).find((row) => row.category_id === categoryId);
  data(
    await admin.from("budgets").insert([
      { ...budget, month: "2026-09-01", carry_over: false },
      { ...budget, month: "2026-10-01" },
      { ...budget, month: "2026-11-01" },
      { ...budget, month: "2027-01-01" },
    ]),
  );
  const transactionId = data(
    await admin
      .from("transactions")
      .insert({
        household_id: household,
        created_by: owner.id,
        account_id: accountId,
        category_id: categoryId,
        type: "expense",
        status: "posted",
        date: "2026-09-20",
        amount: 120,
      })
      .select("id")
      .single(),
  ).id;
  assert(
    data(
      await member.from("budgets").select("id").eq("category_id", categoryId),
    ).length === 0,
    "None permitió leer presupuestos.",
  );
  assert(
    (await member.rpc("budget_snapshot", { p_month: "2026-09-01" })).error,
    "None permitió el agregado.",
  );
  assert(
    (
      await member
        .from("budgets")
        .insert({ ...budget, created_by: userId, month: "2027-03-01" })
    ).error,
    "None permitió crear presupuestos.",
  );
  await permit("budgets", "view");
  assert(
    data(
      await member.from("budgets").select("id").eq("category_id", categoryId),
    ).length === 4,
    "View no pudo leer presupuestos.",
  );
  assert(
    (
      await member
        .from("budgets")
        .insert({ ...budget, created_by: userId, month: "2027-03-01" })
    ).error,
    "View permitió crear presupuestos.",
  );
  assert(
    data(
      await member
        .from("budgets")
        .update({ amount: 99 })
        .eq("category_id", categoryId)
        .select("id"),
    ).length === 0,
    "View permitió editar presupuestos.",
  );
  assert(
    data(
      await member
        .from("budgets")
        .delete()
        .eq("category_id", categoryId)
        .select("id"),
    ).length === 0,
    "View permitió borrar presupuestos.",
  );
  assert(
    (await snapshot("2026-10-01")).carried === 0,
    "El exceso de septiembre se arrastró como deuda.",
  );
  data(
    await admin
      .from("transactions")
      .update({ amount: 30 })
      .eq("id", transactionId),
  );
  const september = await snapshot("2026-09-01");
  assert(
    september.spent === 30 && september.available === 100,
    "El gasto exacto de la categoría no coincide.",
  );
  const october = await snapshot("2026-10-01");
  assert(
    october.carried === 70 && october.available === 170,
    "Octubre no recibió el sobrante de septiembre.",
  );
  assert(
    (await snapshot("2026-11-01")).available === 270,
    "Noviembre no acumuló el sobrante de meses consecutivos.",
  );
  assert(
    (await snapshot("2027-01-01")).carried === 0,
    "El mes ausente no interrumpió el arrastre.",
  );
  assert(
    (await member.rpc("copy_previous_budgets", { p_month: "2027-02-01" }))
      .error,
    "View permitió copiar presupuestos.",
  );
  await permit("budgets", "edit");
  // Verificar copia sin depender de presupuestos reales de otras categorías.
  const expectedCopies = data(
    await admin
      .from("budgets")
      .select("category_id,categories!inner(is_archived,type)")
      .eq("household_id", household)
      .eq("month", "2027-01-01"),
  ).filter(
    (row) => !row.categories.is_archived && row.categories.type === "expense",
  );
  const existingFebruary = new Set(
    data(
      await admin
        .from("budgets")
        .select("category_id")
        .eq("household_id", household)
        .eq("month", "2027-02-01"),
    ).map((row) => row.category_id),
  );
  // Copiar solo sería seguro para datos sintéticos; abortar si existen planes reales en enero.
  assert(
    expectedCopies.every(
      (row) =>
        row.category_id === categoryId || existingFebruary.has(row.category_id),
    ),
    "La prueba no copia presupuestos reales: hay planes de enero sin copia en febrero.",
  );
  assert(
    data(
      await member.rpc("copy_previous_budgets", { p_month: "2027-02-01" }),
    ) === 1,
    "La primera copia no creó exactamente una fila.",
  );
  assert(
    data(
      await member.rpc("copy_previous_budgets", { p_month: "2027-02-01" }),
    ) === 0,
    "La segunda copia duplicó filas.",
  );
  const editable = data(
    await member
      .from("budgets")
      .insert({ ...budget, created_by: userId, month: "2027-03-01" })
      .select("id")
      .single(),
  );
  assert(
    data(
      await member
        .from("budgets")
        .update({ amount: 125 })
        .eq("id", editable.id)
        .select("amount")
        .single(),
    ).amount === 125,
    "Edit no pudo modificar un presupuesto.",
  );
  assert(
    data(
      await member.from("budgets").delete().eq("id", editable.id).select("id"),
    ).length === 1,
    "Edit no pudo borrar un presupuesto.",
  );
  assert(
    (
      await admin
        .from("categories")
        .update({ type: "income" })
        .eq("id", categoryId)
    ).error,
    "Una categoría presupuestada pudo cambiar de tipo.",
  );
  await permit("budgets", "none");
  await permit("dashboard", "view");
  assert(
    (await snapshot("2026-11-01", "dashboard")).available === 270,
    "Dashboard no pudo obtener su agregado autorizado.",
  );
  assert(
    data(
      await member.from("budgets").select("id").eq("category_id", categoryId),
    ).length === 0,
    "Dashboard permitió leer presupuestos crudos.",
  );
  assert(
    data(
      await member
        .from("transactions")
        .select("id")
        .eq("account_id", accountId),
    ).length === 0,
    "Dashboard permitió leer movimientos crudos.",
  );
  assert(
    (await member.rpc("projection_inputs", { p_months: 12 })).error,
    "Dashboard pudo consultar proyecciones sin permiso.",
  );
  await permit("dashboard", "none");
  await permit("projections", "view");
  const projection = data(
    await member.rpc("projection_inputs", { p_months: 12 }),
  );
  assert(
    projection.accounts.some(
      (row) => row.id === accountId && row.balance === 470,
    ),
    "Proyecciones no obtuvo el saldo agregado.",
  );
  assert(
    projection.budgets.length === 13 &&
      projection.budgets.some(
        (month) =>
          month.month === "2026-11-01" &&
          month.rows.some(
            (row) => row.category_id === categoryId && row.available === 270,
          ),
      ),
    "Proyecciones no obtuvo los presupuestos mensuales.",
  );
  assert(
    data(
      await member.from("budgets").select("id").eq("category_id", categoryId),
    ).length === 0,
    "Proyecciones permitió leer presupuestos crudos.",
  );
  assert(
    data(
      await member
        .from("transactions")
        .select("id")
        .eq("account_id", accountId),
    ).length === 0,
    "Proyecciones permitió leer movimientos crudos.",
  );
  console.log(
    "Arrastre, meses ausentes, copia, permisos none/view/edit y agregados independientes: correctos.",
  );
} finally {
  const failures = [];
  const clean = async (label, action) => {
    try {
      data(await action());
    } catch (error) {
      failures.push(`${label}: ${error.message}`);
    }
  };
  if (accountId)
    await clean("movimientos", () =>
      admin.from("transactions").delete().eq("account_id", accountId),
    );
  if (categoryId) {
    await clean("presupuestos", () =>
      admin.from("budgets").delete().eq("category_id", categoryId),
    );
    await clean("categoría", () =>
      admin.from("categories").delete().eq("id", categoryId),
    );
  }
  if (accountId)
    await clean("cuenta", () =>
      admin.from("accounts").delete().eq("id", accountId),
    );
  if (userId) await clean("usuario", () => admin.auth.admin.deleteUser(userId));
  if (failures.length)
    throw new Error(`No se completó la limpieza: ${failures.join("; ")}`);
  console.log("Datos y usuario temporales eliminados.");
}
