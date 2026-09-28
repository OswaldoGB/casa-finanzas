import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { assertTestProject } from "./assert-test-project.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.doesNotThrow(() => assertTestProject(url), "Solo desarrollo.");
const options = { auth: { persistSession: false } };
const service = createClient(
  url,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  options,
);
const member = createClient(
  url,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  options,
);
const checked = (result) => {
  if (result.error) throw new Error(result.error.message);
  return result.data;
};
let householdId, userId;
try {
  const email = `loan-edit-${randomUUID()}@example.com`;
  const password = `${randomUUID()}Aa1!`;
  userId = checked(
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    }),
  ).user.id;
  householdId = checked(
    await service
      .from("households")
      .insert({ name: "Prueba temporal editar préstamo", timezone: "UTC" })
      .select("id")
      .single(),
  ).id;
  checked(
    await service.from("profiles").insert({
      id: userId,
      household_id: householdId,
      role: "member",
      full_name: "Prueba editar préstamo",
    }),
  );
  for (const moduleName of ["accounts", "transactions", "loans"])
    checked(
      await service.from("module_permissions").insert({
        household_id: householdId,
        user_id: userId,
        created_by: userId,
        module: moduleName,
        level: "edit",
      }),
    );
  const addAccount = async (name, type, opening_balance, extra = {}) =>
    checked(
      await service
        .from("accounts")
        .insert({
          household_id: householdId,
          created_by: userId,
          name,
          type,
          opening_balance,
          ...extra,
        })
        .select("id")
        .single(),
    ).id;
  const bank = await addAccount("Banco temporal", "checking", 1000);
  const card = await addAccount("Tarjeta temporal", "credit_card", 0, {
    credit_limit: 2000,
    statement_closing_day: 15,
    payment_due_day: 25,
  });
  checked(await member.auth.signInWithPassword({ email, password }));
  const loanId = checked(
    await member.rpc("loan_create_with_balance_effect", {
      p_debtor: "Ana",
      p_amount: 100,
      p_date: "2026-09-01",
      p_expected_payment_date: null,
      p_notes: null,
      p_account_id: bank,
      p_already_recorded: false,
    }),
  );
  checked(
    await member.rpc("loan_repay", {
      p_loan_id: loanId,
      p_amount: 40,
      p_date: "2026-09-02",
      p_account_id: bank,
    }),
  );
  checked(
    await member.rpc("loan_update", {
      p_loan_id: loanId,
      p_debtor: "Ana López",
      p_amount: 150,
      p_date: "2026-09-01",
      p_expected_payment_date: null,
      p_notes: "Compra compartida",
      p_account_id: card,
      p_already_recorded: false,
    }),
  );
  const snapshot = async () =>
    checked(await member.rpc("loan_snapshot", { p_module: "loans" })).find(
      (row) => row.id === loanId,
    );
  const edited = await snapshot();
  assert.deepEqual(
    {
      debtor: edited.debtor,
      lent: edited.lent,
      recovered: edited.recovered,
      pending: edited.pending,
      notes: edited.notes,
      source: edited.source_account_id,
    },
    {
      debtor: "Ana López",
      lent: 150,
      recovered: 40,
      pending: 110,
      notes: "Compra compartida",
      source: card,
    },
  );
  const balance = async (accountId) =>
    Number(
      checked(
        await member.rpc("account_balance_on", {
          p_account_id: accountId,
          p_date: "2026-09-30",
        }),
      ),
    );
  assert.equal(await balance(bank), 1040, "El abono debe seguir en el banco.");
  assert.equal(
    await balance(card),
    150,
    "El origen nuevo debe ajustar la tarjeta.",
  );
  const initial = checked(
    await service
      .from("transactions")
      .select("amount,date,account_id,description")
      .eq("loan_id", loanId)
      .eq("type", "loan_out")
      .single(),
  );
  assert.deepEqual(initial, {
    amount: 150,
    date: "2026-09-01",
    account_id: card,
    description: "Préstamo a Ana López",
  });
  assert(
    (
      await member.rpc("loan_update", {
        p_loan_id: loanId,
        p_debtor: "Ana López",
        p_amount: 39,
        p_date: "2026-09-01",
        p_account_id: card,
        p_already_recorded: false,
      })
    ).error,
    "No debe permitir un monto menor a lo recuperado.",
  );
  assert(
    (
      await member.rpc("loan_update", {
        p_loan_id: loanId,
        p_debtor: "Ana López",
        p_amount: 150,
        p_date: "2026-09-03",
        p_account_id: card,
        p_already_recorded: false,
      })
    ).error,
    "No debe mover la fecha después de un abono.",
  );
  checked(
    await member.rpc("loan_update", {
      p_loan_id: loanId,
      p_debtor: "Ana López",
      p_amount: 160,
      p_date: "2026-09-01",
      p_account_id: bank,
      p_already_recorded: true,
    }),
  );
  assert.equal(
    await balance(card),
    0,
    "El saldo histórico no debe mover la tarjeta.",
  );
  assert.equal(
    checked(
      await service
        .from("transactions")
        .select("account_id")
        .eq("loan_id", loanId)
        .eq("type", "loan_out")
        .single(),
    ).account_id,
    null,
    "El préstamo histórico debe dejar su salida sin cuenta.",
  );
  console.log("PASS editar préstamos: datos, monto, origen, abonos y saldos.");
} finally {
  if (householdId)
    await service.from("households").delete().eq("id", householdId);
  if (userId) await service.auth.admin.deleteUser(userId);
}
