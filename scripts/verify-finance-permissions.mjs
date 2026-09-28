import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { assertTestProject } from "./assert-test-project.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assertTestProject(url);
const options = { auth: { persistSession: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const member = createClient(
  url,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  options,
);
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function data(result) {
  if (result.error) throw result.error;
  return result.data;
}
let userId, accountId, cardId, ruleId;
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
  const email = `phase2-${randomUUID()}@example.com`;
  const password = `${randomUUID()}Aa1!`;
  userId = data(
    await admin.auth.admin.createUser({ email, password, email_confirm: true }),
  ).user.id;
  data(
    await admin.from("profiles").insert({
      id: userId,
      household_id: household,
      full_name: "Prueba RLS temporal",
      role: "member",
    }),
  );
  accountId = data(
    await admin
      .from("accounts")
      .insert({
        household_id: household,
        created_by: owner.id,
        name: "Prueba RLS temporal",
        type: "checking",
        opening_balance: 10,
      })
      .select("id")
      .single(),
  ).id;
  const category = data(
    await admin
      .from("categories")
      .select("id")
      .eq("household_id", household)
      .eq("type", "expense")
      .limit(1)
      .single(),
  );
  data(await member.auth.signInWithPassword({ email, password }));
  assert(
    data(await member.from("accounts").select("id").eq("id", accountId))
      .length === 0,
    "None permitió leer cuentas.",
  );
  assert(
    data(await member.from("categories").select("id")).length === 0,
    "None permitió leer categorías.",
  );
  const permission = {
    user_id: userId,
    household_id: household,
    module: "transactions",
    level: "view",
    created_by: owner.id,
  };
  data(await admin.from("module_permissions").upsert(permission));
  assert(
    data(await member.from("accounts").select("id").eq("id", accountId))
      .length === 1,
    "View no pudo leer cuentas compartidas.",
  );
  const transaction = {
    household_id: household,
    created_by: userId,
    type: "expense",
    status: "posted",
    amount: 1,
    date: "2026-09-27",
    account_id: accountId,
    category_id: category.id,
    description: "Prueba RLS temporal",
  };
  assert(
    (await member.from("transactions").insert(transaction)).error,
    "View permitió escribir movimientos.",
  );
  data(
    await admin
      .from("module_permissions")
      .upsert({ ...permission, level: "edit" }),
  );
  data(await member.from("transactions").insert(transaction));
  assert(
    data(await member.rpc("account_balances")).find(
      (item) => item.account_id === accountId,
    )?.balance === 9,
    "El saldo publicado no coincide.",
  );
  assert(
    (
      await member.from("categories").insert({
        household_id: household,
        created_by: userId,
        name: "Prueba prohibida",
        type: "expense",
      })
    ).error,
    "El miembro pudo crear categorías.",
  );
  assert(
    (await admin.from("accounts").update({ type: "cash" }).eq("id", accountId))
      .error,
    "Se permitió cambiar el tipo de cuenta.",
  );
  ruleId = data(
    await admin
      .from("recurring_rules")
      .insert({
        household_id: household,
        created_by: owner.id,
        name: "Prueba RLS temporal",
        type: "expense",
        amount: 2,
        account_id: accountId,
        category_id: category.id,
        frequency: "monthly",
        start_date: "2026-09-27",
        next_run_date: "2026-10-27",
        mode: "confirm",
      })
      .select("id")
      .single(),
  ).id;
  data(
    await admin.from("transactions").insert({
      ...transaction,
      amount: 2,
      status: "pending",
      recurring_rule_id: ruleId,
    }),
  );
  assert(
    data(
      await member.rpc("account_balance_on", {
        p_account_id: accountId,
        p_date: "2026-09-27",
      }),
    ) === 9,
    "Un pendiente afectó el saldo.",
  );
  data(
    await admin
      .from("module_permissions")
      .upsert({ ...permission, module: "reports", level: "view" }),
  );
  data(
    await admin
      .from("module_permissions")
      .upsert({ ...permission, level: "none" }),
  );
  const expectedExpense = data(
    await admin
      .from("transactions")
      .select("amount")
      .eq("household_id", household)
      .eq("date", "2026-09-27")
      .eq("status", "posted")
      .eq("type", "expense"),
  ).reduce((sum, item) => sum + Number(item.amount), 0);
  const report = data(
    await member.rpc("analytics_snapshot", {
      p_from: "2026-09-27",
      p_to: "2026-09-27",
      p_module: "reports",
    }),
  );
  assert(
    Math.abs(report.totals.expense - expectedExpense) < 0.001,
    "Reportes no devolvió los agregados autorizados.",
  );
  assert(
    data(await member.from("transactions").select("id")).length === 0,
    "Reportes permitió leer movimientos sin permiso.",
  );
  assert(
    (
      await member.rpc("analytics_snapshot", {
        p_from: "2026-09-27",
        p_to: "2026-09-27",
        p_module: "dashboard",
      })
    ).error,
    "Se permitió un agregado sin permiso del módulo.",
  );
  cardId = data(
    await admin
      .from("accounts")
      .insert({
        household_id: household,
        created_by: owner.id,
        name: "Tarjeta de prueba temporal",
        type: "credit_card",
        opening_balance: 45,
        credit_limit: 100,
        statement_closing_day: 15,
        payment_due_day: 5,
      })
      .select("id")
      .single(),
  ).id;
  data(
    await admin.from("transactions").insert([
      { ...transaction, created_by: owner.id, account_id: cardId, amount: 3 },
      {
        ...transaction,
        created_by: owner.id,
        type: "transfer",
        category_id: null,
        amount: 10,
        destination_account_id: cardId,
      },
    ]),
  );
  assert(
    data(
      await member.rpc("card_statement_unpaid", {
        p_account_id: cardId,
        p_close: "2026-09-15",
        p_today: "2026-09-27",
      }),
    ) === 35,
    "El pago pendiente incluyó cargos posteriores al corte o ignoró abonos.",
  );
  assert(
    data(await member.rpc("account_balances")).find(
      (item) => item.account_id === cardId,
    )?.balance === 38,
    "El saldo actual de la tarjeta no coincide.",
  );
  const recurringToday = data(
    await admin
      .from("households")
      .select("timezone")
      .eq("id", household)
      .single(),
  );
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: recurringToday.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const datePart = (type) => parts.find((item) => item.type === type).value;
  const next = new Date(
    `${datePart("year")}-${datePart("month")}-${datePart("day")}T00:00:00Z`,
  );
  next.setUTCDate(next.getUTCDate() + 1);
  const nextDate = next.toISOString().slice(0, 10);
  data(
    await admin
      .from("recurring_rules")
      .update({ frequency: "weekly", next_run_date: nextDate })
      .eq("id", ruleId),
  );
  const expanded = data(
    await member.rpc("analytics_snapshot", {
      p_from: "2026-09-27",
      p_to: "2026-09-27",
      p_module: "reports",
    }),
  );
  assert(
    expanded.upcoming.filter((item) => item.id === ruleId).length === 2,
    "El horizonte omitió una segunda ocurrencia semanal.",
  );
  data(
    await admin
      .from("accounts")
      .update({ is_archived: true })
      .eq("id", accountId),
  );
  assert(
    data(
      await admin
        .from("recurring_rules")
        .select("is_active")
        .eq("id", ruleId)
        .single(),
    ).is_active === false,
    "Archivar no detuvo el recurrente.",
  );
  console.log(
    "Permisos none/view/edit, catálogos admin, saldos, pendientes y protecciones de cuenta: correctos.",
  );
} finally {
  for (const id of [accountId, cardId].filter(Boolean))
    data(
      await admin
        .from("transactions")
        .delete()
        .or(`account_id.eq.${id},destination_account_id.eq.${id}`),
    );
  if (ruleId)
    data(await admin.from("recurring_rules").delete().eq("id", ruleId));
  if (accountId)
    data(await admin.from("accounts").delete().eq("id", accountId));
  if (cardId) data(await admin.from("accounts").delete().eq("id", cardId));
  if (userId) data(await admin.auth.admin.deleteUser(userId));
  console.log("Datos y usuario temporales eliminados.");
}
