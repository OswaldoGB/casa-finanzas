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
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function data(result) {
  if (result.error) throw result.error;
  return result.data;
}
let userId, accountId, ruleId;
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
    await admin
      .from("profiles")
      .insert({
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
      await member
        .from("categories")
        .insert({
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
    await admin
      .from("transactions")
      .insert({
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
  if (accountId)
    data(await admin.from("transactions").delete().eq("account_id", accountId));
  if (ruleId)
    data(await admin.from("recurring_rules").delete().eq("id", ruleId));
  if (accountId)
    data(await admin.from("accounts").delete().eq("id", accountId));
  if (userId) data(await admin.auth.admin.deleteUser(userId));
  console.log("Datos y usuario temporales eliminados.");
}
