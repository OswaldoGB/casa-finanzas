import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { assertTestProject } from "./assert-test-project.mjs";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(
    "Uso: node --env-file=.env.local scripts/seed-dev.mjs --confirmar\nCrea datos Demo en el proyecto de desarrollo. No crea usuarios ni modifica datos existentes.",
  );
  process.exit(0);
}
if (args.length !== 1 || args[0] !== "--confirmar") {
  console.error(
    "Debes autorizar los datos de ejemplo con --confirmar. Usa --help para ver el comando.",
  );
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
try {
  assertTestProject(url);
} catch {
  console.error(
    "Este script solo se permite en el proyecto de desarrollo configurado.",
  );
  process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  process.exit(1);
}

const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
function data(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
const inserted = [];
let householdId;
async function insert(table, rows) {
  const values = rows.map((row) => ({ ...row, id: randomUUID() }));
  // Track IDs before sending: cleanup also covers a lost response after a successful insert.
  inserted.push({ table, ids: values.map((row) => row.id) });
  data(await admin.from(table).insert(values));
  return values;
}
try {
  const owner = data(
    await admin
      .from("profiles")
      .select("id,household_id")
      .eq("role", "admin")
      .single(),
  );
  householdId = owner.household_id;
  for (const table of [
    "accounts",
    "categories",
    "projects",
    "savings_goals",
    "shopping_lists",
    "inventory_items",
  ]) {
    const existing = data(
      await admin
        .from(table)
        .select("id")
        .eq("household_id", householdId)
        .like("name", "Demo · %")
        .limit(1),
    );
    if (existing.length) {
      console.log(
        "Ya existen datos Demo en este hogar. No se agregó ni modificó nada.",
      );
      process.exit(0);
    }
  }
  const household = data(
    await admin
      .from("households")
      .select("timezone")
      .eq("id", householdId)
      .single(),
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: household.timezone,
  }).format(new Date());
  const [year, month, day] = today.split("-").map(Number);
  const dateInMonth = (offset, dateDay = 1) =>
    new Date(Date.UTC(year, month - 1 + offset, dateDay))
      .toISOString()
      .slice(0, 10);
  const started = `${dateInMonth(-5)}T12:00:00Z`;
  const base = { household_id: householdId, created_by: owner.id };
  const [checking, savings] = await insert("accounts", [
    {
      ...base,
      name: "Demo · Cuenta diaria",
      type: "checking",
      opening_balance: 500,
      color: "#c98552",
      created_at: started,
    },
    {
      ...base,
      name: "Demo · Ahorros",
      type: "savings",
      opening_balance: 300,
      color: "#16a34a",
      created_at: started,
    },
  ]);
  const [income, groceries, home] = await insert("categories", [
    { ...base, name: "Demo · Salario", type: "income", color: "#16a34a" },
    { ...base, name: "Demo · Supermercado", type: "expense", color: "#c98552" },
    { ...base, name: "Demo · Hogar", type: "expense", color: "#6366f1" },
  ]);
  const [project] = await insert("projects", [
    {
      ...base,
      name: "Demo · Mejorar la sala",
      budget: 900,
      start_date: dateInMonth(-2),
      status: "active",
    },
  ]);
  const [goal] = await insert("savings_goals", [
    {
      ...base,
      name: "Demo · Fondo de emergencia",
      type: "goal",
      target_amount: 1500,
      target_date: dateInMonth(6),
      account_id: savings.id,
    },
  ]);
  const transactions = [],
    budgets = [];
  for (let offset = -5; offset <= 0; offset++) {
    const date = dateInMonth(offset, offset === 0 ? Math.min(day, 5) : 5);
    const tx = {
      ...base,
      account_id: checking.id,
      date,
      created_at: `${date}T12:00:00Z`,
    };
    transactions.push(
      {
        ...tx,
        type: "income",
        amount: 1400 + (offset + 5) * 25,
        category_id: income.id,
        description: "Demo · Salario mensual",
      },
      {
        ...tx,
        type: "expense",
        amount: 185 + (offset + 5) * 12,
        category_id: groceries.id,
        description: "Demo · Compra del supermercado",
      },
      {
        ...tx,
        type: "expense",
        amount: 75,
        category_id: home.id,
        project_id: project.id,
        description: "Demo · Mejoras para la sala",
      },
      {
        ...tx,
        type: "goal_contribution",
        amount: 100,
        destination_account_id: savings.id,
        savings_goal_id: goal.id,
        description: "Demo · Aporte al fondo de emergencia",
      },
    );
    budgets.push(
      {
        ...base,
        month: dateInMonth(offset),
        category_id: groceries.id,
        amount: 300,
        carry_over: true,
      },
      {
        ...base,
        month: dateInMonth(offset),
        category_id: home.id,
        amount: 125,
        carry_over: false,
      },
    );
  }
  await insert("transactions", transactions);
  await insert("budgets", budgets);
  await insert("inventory_items", [
    {
      ...base,
      name: "Demo · Cafetera",
      location: "Cocina",
      category: "Electrodomésticos",
      quantity: 1,
      purchase_date: dateInMonth(-2),
      purchase_price: 65,
      warranty_until: dateInMonth(10),
      condition: "good",
    },
  ]);
  const [list] = await insert("shopping_lists", [
    {
      ...base,
      name: "Demo · Compra semanal",
      store: "Supermercado",
      budget: 75,
    },
  ]);
  await insert("shopping_list_items", [
    {
      ...base,
      list_id: list.id,
      name: "Demo · Leche",
      quantity: 2,
      unit: "litros",
      estimated_price: 1.75,
      sort_order: 1,
    },
    {
      ...base,
      list_id: list.id,
      name: "Demo · Arroz",
      quantity: 1,
      unit: "bolsa",
      estimated_price: 2.5,
      sort_order: 2,
    },
  ]);
  console.log(
    "Datos Demo creados: dos cuentas, tres categorías, 24 movimientos de seis meses, presupuestos, un proyecto, una meta, un artículo y una lista. No se crearon usuarios.",
  );
} catch (error) {
  let cleanupFailed = false;
  for (const { table, ids } of inserted.reverse()) {
    const result = await admin
      .from(table)
      .delete()
      .eq("household_id", householdId)
      .in("id", ids);
    if (result.error) cleanupFailed = true;
  }
  console.error(`No se completó la carga Demo: ${error.message}`);
  console.error(
    cleanupFailed
      ? "No se pudo retirar toda la carga parcial; revisa los registros Demo antes de repetir."
      : "Se retiraron los registros creados por este intento.",
  );
  process.exitCode = 1;
}
