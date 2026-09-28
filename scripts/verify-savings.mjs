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
const data = (r) => {
  if (r.error) throw r.error;
  return r.data;
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
let userId, loanId, historyLoanId, cardId;
const accounts = [],
  goals = [];
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
    "La prueba requiere espacio de miembro vacío; no modifica miembros existentes.",
  );
  const email = `savings-${randomUUID()}@example.com`,
    password = `${randomUUID()}Aa1!`;
  userId = data(
    await admin.auth.admin.createUser({ email, password, email_confirm: true }),
  ).user.id;
  data(
    await admin.from("profiles").insert({
      id: userId,
      household_id: household,
      role: "member",
      full_name: "Prueba temporal ahorro",
    }),
  );
  const base = { household_id: household, created_by: owner.id };
  const owned = { ...base, created_by: userId };
  for (const type of ["checking", "savings"]) {
    accounts.push(
      data(
        await admin
          .from("accounts")
          .insert({
            ...base,
            name: "Prueba temporal ahorro",
            type,
            opening_balance: 1000,
          })
          .select("id")
          .single(),
      ).id,
    );
  }
  cardId = data(
    await admin
      .from("accounts")
      .insert({
        ...base,
        name: "Tarjeta temporal préstamo",
        type: "credit_card",
        opening_balance: 1000,
        credit_limit: 2000,
        statement_closing_day: 15,
        payment_due_day: 25,
      })
      .select("id")
      .single(),
  ).id;
  data(await member.auth.signInWithPassword({ email, password }));
  const permit = async (module, level) =>
    data(
      await admin
        .from("module_permissions")
        .upsert({ ...base, user_id: userId, module, level }),
    );
  const loanArgs = {
    p_debtor: "Deudor temporal",
    p_amount: 100,
    p_date: "2026-09-01",
    p_expected_payment_date: "2026-09-15",
    p_notes: null,
    p_account_id: accounts[0],
  };
  assert(
    (await member.rpc("loan_snapshot")).error,
    "None pudo consultar préstamos.",
  );
  assert(
    (await member.rpc("loan_create", loanArgs)).error,
    "None pudo crear préstamos.",
  );
  await permit("loans", "view");
  assert(
    Array.isArray(data(await member.rpc("loan_snapshot"))),
    "View no pudo consultar préstamos.",
  );
  assert(
    (await member.rpc("loan_create", loanArgs)).error,
    "View pudo crear préstamos.",
  );
  await permit("loans", "edit");
  assert(
    (await member.rpc("loan_create", loanArgs)).error,
    "Loans edit sin transactions edit pudo generar préstamo.",
  );
  await permit("transactions", "edit");
  historyLoanId = data(
    await member.rpc("loan_create_with_balance_effect", {
      ...loanArgs,
      p_debtor: "Préstamo ya incluido",
      p_amount: 150,
      p_account_id: cardId,
      p_already_recorded: true,
    }),
  );
  const history = async () =>
    data(await member.rpc("loan_snapshot", { p_module: "loans" })).find(
      (row) => row.id === historyLoanId,
    );
  assert(
    (await history()).pending === 150 &&
      (await history()).already_recorded === true &&
      (await history()).source_account_type === "credit_card",
    "El préstamo histórico de tarjeta no conservó pendiente u origen.",
  );
  assert(
    data(
      await admin
        .from("transactions")
        .select("account_id")
        .eq("loan_id", historyLoanId)
        .eq("type", "loan_out")
        .single(),
    ).account_id === null,
    "Un préstamo ya incluido volvió a afectar una cuenta.",
  );
  data(
    await member.rpc("loan_update_source", {
      p_loan_id: historyLoanId,
      p_account_id: accounts[1],
      p_already_recorded: false,
    }),
  );
  assert(
    data(
      await admin
        .from("transactions")
        .select("account_id")
        .eq("loan_id", historyLoanId)
        .eq("type", "loan_out")
        .single(),
    ).account_id === accounts[1],
    "La corrección de origen no movió la salida inicial.",
  );
  assert(
    (
      await member.rpc("loan_repay", {
        p_loan_id: historyLoanId,
        p_amount: 1,
        p_date: "2026-09-27",
        p_account_id: cardId,
      })
    ).error,
    "Un abono no puede depositarse en una tarjeta.",
  );
  data(
    await member.rpc("loan_repay", {
      p_loan_id: historyLoanId,
      p_amount: 20,
      p_date: "2026-09-27",
      p_account_id: accounts[0],
    }),
  );
  assert(
    data(
      await admin
        .from("transactions")
        .select("account_id")
        .eq("loan_id", historyLoanId)
        .eq("type", "loan_repayment")
        .single(),
    ).account_id === accounts[0],
    "El abono no se depositó en la cuenta elegida.",
  );
  loanId = data(await member.rpc("loan_create", loanArgs));
  const loan = async (module = "loans") =>
    data(await member.rpc("loan_snapshot", { p_module: module })).find(
      (r) => r.id === loanId,
    );
  const repay = (amount) =>
    member.rpc("loan_repay", {
      p_loan_id: loanId,
      p_amount: amount,
      p_date: "2026-09-27",
      p_account_id: accounts[0],
    });
  data(await repay(30));
  assert(
    (await loan()).pending === 70 && (await loan()).recovered === 30,
    "El préstamo no calculó abono y pendiente.",
  );
  assert((await repay(71)).error, "Se aceptó un sobreabono.");
  const concurrent = await Promise.all([repay(50), repay(50)]);
  assert(
    concurrent.filter((r) => !r.error).length === 1,
    "Los abonos concurrentes no se serializaron.",
  );
  assert(
    (await loan()).pending === 20,
    "Saldo tras abonos concurrentes incorrecto.",
  );
  assert(
    (
      await member.from("transactions").insert({
        ...owned,
        type: "loan_repayment",
        amount: 21,
        date: "2026-09-27",
        account_id: accounts[0],
        loan_id: loanId,
      })
    ).error,
    "El libro directo permitió sobreabonar.",
  );
  assert(
    (
      await member.from("transactions").insert({
        ...owned,
        type: "loan_out",
        amount: 1,
        date: "2026-09-27",
        account_id: accounts[0],
        loan_id: randomUUID(),
      })
    ).error,
    "El libro aceptó un préstamo ajeno/inexistente.",
  );
  data(await member.rpc("loan_write_off", { p_loan_id: loanId }));
  assert(
    (await loan()).status === "written_off" &&
      (await loan()).pending === 0 &&
      (await loan()).recovered === 80,
    "Dar por perdido alteró el dinero recuperado o dejó patrimonio pendiente.",
  );
  assert(
    data(
      await admin
        .from("transactions")
        .select("id")
        .eq("loan_id", loanId)
        .eq("type", "expense"),
    ).length === 0,
    "Dar por perdido creó un gasto.",
  );
  assert((await repay(1)).error, "Un préstamo perdido aceptó abonos.");

  await permit("savings", "edit");
  for (const account_id of [null, accounts[1]])
    goals.push(
      data(
        await member
          .from("savings_goals")
          .insert({
            ...owned,
            name: "Apartado temporal",
            type: "goal",
            target_amount: 500,
            account_id,
          })
          .select("id")
          .single(),
      ).id,
    );
  const operation = (goal, type, amount, counterparty = null) =>
    member.rpc("savings_goal_operation", {
      p_goal_id: goal,
      p_type: type,
      p_amount: amount,
      p_date: "2026-09-27",
      p_counterparty_account_id: counterparty,
    });
  const goal = async (id, module = "savings") =>
    data(await member.rpc("savings_snapshot", { p_module: module })).find(
      (r) => r.id === id,
    );
  const balances = async () =>
    new Map(
      data(await member.rpc("account_balances")).map((r) => [
        r.account_id,
        r.balance,
      ]),
    );
  const beforeVirtual = (await balances()).get(accounts[0]);
  data(await operation(goals[0], "goal_contribution", 100));
  data(await operation(goals[0], "goal_withdrawal", 30));
  assert(
    (await goal(goals[0])).balance === 70,
    "El apartado virtual no calculó aportes menos retiros.",
  );
  assert(
    (await balances()).get(accounts[0]) === beforeVirtual,
    "El apartado virtual alteró el dinero de cuentas.",
  );
  assert(
    (await operation(goals[0], "goal_withdrawal", 71)).error,
    "Se aceptó retirar más del apartado virtual.",
  );
  assert(
    (
      await member.from("transactions").insert({
        ...owned,
        type: "goal_withdrawal",
        amount: 71,
        date: "2026-09-27",
        savings_goal_id: goals[0],
      })
    ).error,
    "El libro directo permitió sobreretirar.",
  );
  assert(
    (await operation(goals[0], "goal_contribution", 1, accounts[0])).error,
    "El apartado virtual aceptó mover cuentas.",
  );
  const beforeLinked = await balances();
  data(await operation(goals[1], "goal_contribution", 100, accounts[0]));
  data(await operation(goals[1], "goal_withdrawal", 30, accounts[0]));
  const afterLinked = await balances();
  assert(
    afterLinked.get(accounts[0]) === beforeLinked.get(accounts[0]) - 70 &&
      afterLinked.get(accounts[1]) === beforeLinked.get(accounts[1]) + 70,
    "Los aportes vinculados no se transfirieron entre cuentas.",
  );
  assert(
    (await operation(goals[1], "goal_withdrawal", 71, accounts[0])).error,
    "El apartado vinculado aceptó sobreretirar.",
  );
  assert(
    (await operation(goals[1], "goal_contribution", 1, accounts[1])).error,
    "El apartado aceptó transferir a la misma cuenta.",
  );
  assert(
    (
      await member
        .from("savings_goals")
        .update({ account_id: accounts[0] })
        .eq("id", goals[1])
    ).error,
    "Se cambió la cuenta después de registrar movimientos.",
  );
  data(await operation(goals[0], "goal_withdrawal", 70));
  assert(
    (
      await member
        .from("savings_goals")
        .update({ account_id: accounts[0] })
        .eq("id", goals[0])
    ).error,
    "El saldo cero permitió reinterpretar movimientos virtuales históricos.",
  );
  await permit("transactions", "none");
  await permit("loans", "none");
  await permit("savings", "view");
  assert(
    (await goal(goals[1])).balance === 70,
    "Savings view sin transactions pudo consultar agregado incorrecto.",
  );
  assert(
    (await operation(goals[1], "goal_contribution", 1, accounts[0])).error,
    "Savings view permitió aportes.",
  );
  assert(
    data(
      await member.from("transactions").select("id").eq("created_by", userId),
    ).length === 0,
    "Savings view filtró movimientos crudos.",
  );
  await permit("savings", "none");
  await permit("dashboard", "view");
  assert(
    (await loan("dashboard")).recovered === 80 &&
      (await goal(goals[1], "dashboard")).balance === 70,
    "Dashboard solo no pudo consultar los agregados independientes.",
  );
  assert(
    data(await member.from("loans").select("id").eq("id", loanId)).length === 0,
    "Dashboard pudo leer préstamos crudos.",
  );
  assert(
    data(await member.from("savings_goals").select("id").in("id", goals))
      .length === 0,
    "Dashboard pudo leer ahorro crudo.",
  );
  assert(
    data(
      await member.from("transactions").select("id").eq("created_by", userId),
    ).length === 0,
    "Dashboard pudo leer movimientos crudos.",
  );
  assert(
    (await member.rpc("loan_snapshot", { p_module: "accounts" })).error,
    "Loan snapshot aceptó un módulo arbitrario.",
  );
  assert(
    (await member.rpc("savings_snapshot", { p_module: "reports" })).error,
    "Savings snapshot aceptó un módulo arbitrario.",
  );
  console.log(
    "Préstamos, abonos concurrentes, apartados virtuales/vinculados y permisos independientes: correctos.",
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
  for (const id of [loanId, historyLoanId].filter(Boolean)) {
    await clean("abonos", () =>
      admin
        .from("transactions")
        .delete()
        .eq("loan_id", id)
        .eq("type", "loan_repayment"),
    );
    await clean("desembolso", () =>
      admin.from("transactions").delete().eq("loan_id", id),
    );
    await clean("préstamo", () => admin.from("loans").delete().eq("id", id));
  }
  for (const id of goals) {
    await clean("retiros", () =>
      admin
        .from("transactions")
        .delete()
        .eq("savings_goal_id", id)
        .eq("type", "goal_withdrawal"),
    );
    await clean("aportes", () =>
      admin.from("transactions").delete().eq("savings_goal_id", id),
    );
    await clean("apartado", () =>
      admin.from("savings_goals").delete().eq("id", id),
    );
  }
  for (const id of accounts)
    await clean("cuenta", () => admin.from("accounts").delete().eq("id", id));
  if (cardId)
    await clean("tarjeta", () =>
      admin.from("accounts").delete().eq("id", cardId),
    );
  if (userId) await clean("usuario", () => admin.auth.admin.deleteUser(userId));
  if (failures.length)
    throw new Error(`Limpieza incompleta: ${failures.join("; ")}`);
  console.log("Datos y usuario temporales eliminados.");
}
