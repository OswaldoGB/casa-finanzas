import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(
  url,
  "https://rtqqmmahfdwcnaydrhhc.supabase.co",
  "Solo desarrollo.",
);
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const cookies = new Map();
const client = createServerClient(
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
const checked = (result) => {
  if (result.error) throw new Error(result.error.message);
  return result.data;
};
let home, user;
try {
  const email = `cards-${randomUUID()}@example.com`,
    password = `${randomUUID()}Aa1!`;
  user = checked(
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    }),
  ).user.id;
  home = checked(
    await service
      .from("households")
      .insert({ name: "Prueba temporal tarjetas", timezone: "UTC" })
      .select("id")
      .single(),
  ).id;
  checked(
    await service.from("profiles").insert({
      id: user,
      household_id: home,
      role: "member",
      full_name: "Prueba tarjetas",
    }),
  );
  const permit = async (module, level) =>
    checked(
      await service.from("module_permissions").upsert(
        {
          household_id: home,
          user_id: user,
          created_by: user,
          module,
          level,
        },
        { onConflict: "user_id,module" },
      ),
    );
  for (const moduleName of ["accounts", "transactions", "projections"])
    await permit(moduleName, "edit");
  checked(await client.auth.signInWithPassword({ email, password }));
  const category = checked(
    await service
      .from("categories")
      .insert({
        household_id: home,
        created_by: user,
        name: "Prueba compra",
        type: "expense",
      })
      .select("id")
      .single(),
  ).id;
  const addAccount = async (name, type, opening_balance, extra = {}) =>
    checked(
      await service
        .from("accounts")
        .insert({
          household_id: home,
          created_by: user,
          name,
          type,
          opening_balance,
          ...extra,
        })
        .select("id")
        .single(),
    ).id;
  const card = await addAccount("Tarjeta prueba", "credit_card", 0, {
    credit_limit: 2000,
    statement_closing_day: 15,
    payment_due_day: 25,
  });
  const a = await addAccount("Banco A", "checking", 500),
    b = await addAccount("Banco B", "savings", 400);
  const balance = async (id, date = "2026-01-20") =>
    Number(
      checked(
        await client.rpc("account_balance_on", {
          p_account_id: id,
          p_date: date,
        }),
      ),
    );
  const unpaid = async (id, close, today) =>
    Number(
      checked(
        await client.rpc("card_statement_unpaid", {
          p_account_id: id,
          p_close: close,
          p_today: today,
        }),
      ),
    );
  const planId = randomUUID();
  const plan = {
    p_id: planId,
    p_card_id: card,
    p_name: "Laptop temporal",
    p_amount: 300,
    p_installments: 3,
    p_purchase_date: "2026-01-10",
    p_first_close: "2026-01-15",
    p_existing: false,
    p_category_id: category,
  };
  checked(await client.rpc("create_card_installment", plan));
  checked(await client.rpc("create_card_installment", plan));
  assert.equal(
    await balance(card),
    300,
    "Compra/idempotencia debe sumar una sola vez.",
  );
  assert.equal(await unpaid(card, "2026-01-15", "2026-01-16"), 100);
  assert.equal(
    Number(
      checked(
        await client.rpc("card_unbilled_installments", {
          p_card_id: card,
          p_date: "2026-01-15",
        }),
      ),
    ),
    200,
  );
  const payment = {
    p_id: randomUUID(),
    p_card_id: card,
    p_date: "2026-01-20",
    p_sources: [
      { account_id: a, amount: 40 },
      { account_id: b, amount: 60 },
    ],
  };
  checked(await client.rpc("pay_credit_card", payment));
  checked(await client.rpc("pay_credit_card", payment));
  assert.equal(await balance(card), 200);
  assert.equal(await balance(a), 460);
  assert.equal(await balance(b), 340);
  assert.equal(await unpaid(card, "2026-01-15", "2026-01-20"), 0);
  assert.equal(
    checked(
      await service
        .from("transactions")
        .select("id")
        .eq("card_payment_id", payment.p_id),
    ).length,
    2,
  );
  const failing = {
    ...payment,
    p_id: randomUUID(),
    p_sources: [
      { account_id: a, amount: 10 },
      { account_id: b, amount: 350 },
    ],
  };
  assert(
    (await client.rpc("pay_credit_card", failing)).error,
    "Debe bloquear saldo insuficiente.",
  );
  assert.equal(
    await balance(a),
    460,
    "Fallo no debe guardar el primer aporte.",
  );
  assert.equal(
    checked(
      await service.from("card_payments").select("id").eq("id", failing.p_id),
    ).length,
    0,
  );
  assert(
    (
      await client.rpc("pay_credit_card", {
        ...payment,
        p_id: randomUUID(),
        p_sources: [
          { account_id: a, amount: 10 },
          { account_id: a, amount: 10 },
        ],
      })
    ).error,
  );
  assert(
    (
      await client.rpc("pay_credit_card", {
        ...payment,
        p_id: randomUUID(),
        p_sources: [{ account_id: a, amount: 201 }],
      })
    ).error,
  );
  assert(
    (
      await client
        .from("transactions")
        .update({ amount: 301 })
        .eq(
          "id",
          checked(
            await service
              .from("card_installment_plans")
              .select("transaction_id")
              .eq("id", planId)
              .single(),
          ).transaction_id,
        )
    ).error,
    "Gasto financiado no debe poder alterarse por separado.",
  );
  const preflight = await client.rpc("assert_transactions_unfinanced", {
    p_ids: [
      checked(
        await service
          .from("card_installment_plans")
          .select("transaction_id")
          .eq("id", planId)
          .single(),
      ).transaction_id,
    ],
  });
  assert.match(
    preflight.error?.message ?? "",
    /Quita primero/,
    "Bloquear el borrado antes de tocar comprobantes.",
  );
  checked(
    await client.rpc("assert_transactions_unfinanced", {
      p_ids: [randomUUID()],
    }),
  );
  const concurrentCard = await addAccount(
    "Pago concurrente",
    "credit_card",
    100,
    { credit_limit: 2000, statement_closing_day: 15, payment_due_day: 25 },
  );
  const concurrent = await Promise.all(
    [1, 2].map(() =>
      client.rpc("pay_credit_card", {
        p_id: randomUUID(),
        p_card_id: concurrentCard,
        p_date: "2026-01-20",
        p_sources: [{ account_id: a, amount: 80 }],
      }),
    ),
  );
  assert.equal(
    concurrent.filter((result) => !result.error).length,
    1,
    "Un segundo pago concurrente no debe superar la deuda.",
  );
  assert.equal(await balance(concurrentCard), 20);
  const existing = await addAccount("Deuda existente", "credit_card", 1000, {
    credit_limit: 2000,
    statement_closing_day: 31,
    payment_due_day: 5,
  });
  const imported = {
    ...plan,
    p_id: randomUUID(),
    p_card_id: existing,
    p_amount: 1000,
    p_installments: 3,
    p_existing: true,
    p_first_close: "2026-01-31",
    p_category_id: null,
  };
  checked(await client.rpc("create_card_installment", imported));
  assert.equal(
    await balance(existing),
    1000,
    "Importar plan no duplica deuda.",
  );
  assert.equal(await unpaid(existing, "2026-01-31", "2026-02-01"), 333.33);
  const schedule = checked(
    await client.rpc("card_installment_schedule", {
      p_card_id: existing,
      p_after: "2026-01-01",
      p_until: "2026-04-30",
    }),
  );
  assert.deepEqual(
    schedule.map((row) => [row.close_date, row.due_date, Number(row.amount)]),
    [
      ["2026-01-31", "2026-02-05", 333.33],
      ["2026-02-28", "2026-03-05", 333.33],
      ["2026-03-31", "2026-04-05", 333.34],
    ],
  );
  assert(
    (
      await client.rpc("create_card_installment", {
        ...imported,
        p_id: randomUUID(),
      })
    ).error,
    "No reutilizar deuda ya financiada.",
  );
  const shortMonth = await addAccount("Corte corto", "credit_card", 300, {
    credit_limit: 2000,
    statement_closing_day: 30,
    payment_due_day: 31,
  });
  checked(
    await client.rpc("create_card_installment", {
      ...imported,
      p_id: randomUUID(),
      p_card_id: shortMonth,
      p_amount: 300,
      p_first_close: "2026-01-30",
    }),
  );
  const shortSchedule = checked(
    await client.rpc("card_installment_schedule", {
      p_card_id: shortMonth,
      p_after: "2026-01-01",
      p_until: "2026-04-30",
    }),
  );
  assert.deepEqual(
    shortSchedule.map((row) => [row.close_date, row.due_date]),
    [
      ["2026-01-30", "2026-01-31"],
      ["2026-02-28", "2026-03-31"],
      ["2026-03-30", "2026-03-31"],
    ],
    "Si el día de pago se acorta al mismo día del corte, debe pasar al siguiente mes.",
  );
  const now = new Date().toISOString().slice(0, 10);
  const nextMonth = new Date(`${now.slice(0, 7)}-01T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  nextMonth.setUTCDate(15);
  const futureCard = await addAccount("Cuotas futuras", "credit_card", 0, {
    credit_limit: 2000,
    statement_closing_day: 15,
    payment_due_day: 25,
  });
  checked(
    await client.rpc("create_card_installment", {
      ...plan,
      p_id: randomUUID(),
      p_card_id: futureCard,
      p_purchase_date: now,
      p_first_close: nextMonth.toISOString().slice(0, 10),
    }),
  );
  const projection = checked(
    await client.rpc("projection_inputs", { p_months: 12 }),
  );
  assert.equal(
    projection.accounts.find((row) => row.id === futureCard).installment_future,
    300,
    "Debe diferir también una compra posterior al último corte.",
  );
  assert.equal(
    projection.installments.filter((row) => row.card_id === futureCard).length,
    3,
  );
  await permit("accounts", "view");
  assert(
    (await client.rpc("pay_credit_card", { ...payment, p_id: randomUUID() }))
      .error,
  );
  assert(
    (
      await client.rpc("create_card_installment", {
        ...imported,
        p_id: randomUUID(),
      })
    ).error,
  );
  await permit("accounts", "edit");
  await permit("transactions", "none");
  assert(
    (await client.rpc("pay_credit_card", { ...payment, p_id: randomUUID() }))
      .error,
  );
  assert(
    (
      await client.rpc("create_card_installment", {
        ...plan,
        p_id: randomUUID(),
      })
    ).error,
  );
  await permit("accounts", "none");
  await permit("projections", "view");
  assert.equal(
    checked(await client.from("card_installment_plans").select("id")).length,
    0,
    "Proyecciones no expone planes crudos.",
  );
  assert(
    checked(await client.rpc("projection_inputs", { p_months: 3 })).installments
      .length > 0,
  );
  await permit("accounts", "edit");
  await permit("transactions", "edit");
  const response = await fetch(`http://localhost:3000/accounts/${futureCard}`, {
    headers: {
      cookie: [...cookies]
        .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
        .join("; "),
    },
    redirect: "manual",
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const label of [
    "Pagar tarjeta",
    "Añadir compra a plazos",
    "Laptop temporal",
    "Pendiente de pagar este corte",
  ])
    assert(html.includes(label), `Falta ${label}.`);
  checked(await client.rpc("remove_card_installment", { p_id: imported.p_id }));
  assert.equal(await balance(existing), 1000);
  assert.equal(await unpaid(existing, "2026-01-31", "2026-02-01"), 1000);
  console.log(
    "PASS tarjetas: deuda única, cuotas/centavos/febrero, pagos desde dos cuentas, idempotencia, rollback, permisos, proyecciones y página de tarjeta.",
  );
} finally {
  if (home) {
    checked(
      await service
        .from("card_installment_plans")
        .delete()
        .eq("household_id", home),
    );
    checked(
      await service.from("transactions").delete().eq("household_id", home),
    );
    checked(
      await service.from("card_payments").delete().eq("household_id", home),
    );
    checked(await service.from("accounts").delete().eq("household_id", home));
    checked(await service.from("categories").delete().eq("household_id", home));
    checked(
      await service
        .from("module_permissions")
        .delete()
        .eq("household_id", home),
    );
    checked(await service.from("profiles").delete().eq("household_id", home));
    checked(await service.from("households").delete().eq("id", home));
  }
  if (user) checked(await service.auth.admin.deleteUser(user));
  console.log("Datos, hogar y usuario temporales eliminados.");
}
