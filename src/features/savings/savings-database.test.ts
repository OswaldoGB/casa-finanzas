import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";

// Todas las migraciones reales sobre un Postgres limpio (sin red ni datos).
const home = "00000000-0000-4000-8000-000000000001",
  user = "00000000-0000-4000-8000-000000000002",
  goal = "00000000-0000-4000-8000-000000000003";
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role authenticated; create role anon; create role service_role;
    create schema auth; create schema storage; create schema extensions;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql as $$ select '${user}'::uuid $$;
    create function auth.jwt() returns jsonb language sql as $$ select '{}'::jsonb $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
    alter table storage.objects enable row level security;
    create publication supabase_realtime;
    create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
  `);
  for (const f of (await readdir("supabase/migrations")).filter((f) => f.endsWith(".sql")).sort())
    await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
  await db.exec(`
    insert into auth.users(id) values ('${user}');
    insert into households(id,name) values ('${home}','Casa');
    insert into profiles(id,household_id,full_name,role) values ('${user}','${home}','Yo','admin');
    insert into savings_goals(id,household_id,created_by,name,type,target_amount)
      values ('${goal}','${home}','${user}','Detergente','provision',30);
  `);
}, 180000);

const move = (type: string, amount: number) =>
  db.query(
    `insert into transactions(household_id,created_by,type,amount,date,savings_goal_id)
     values ($1,$2,$3,$4,'2026-10-01',$5)`,
    [home, user, type, amount, goal],
  );

it("agrupa los saldos al corte y los pendientes de tarjeta sin cambiar sus valores", async () => {
  await db.exec("begin");
  try {
    await db.query(
      "insert into accounts(household_id,created_by,name,type,opening_balance,credit_limit,statement_closing_day,payment_due_day) values ($1,$2,'Tarjeta','credit_card',50,500,7,25)",
      [home, user],
    );
    const result = await db.query<{ matches: boolean }>(`
      with cuts as (select jsonb_object_agg(id, '2026-10-07'::text) as dates from accounts),
      batch as (select analytics_account_totals('2026-10-10', dates) as data from cuts)
      select bool_and(
        (batch.data -> a.id::text ->> 'balance')::numeric = account_balance_on(a.id, '2026-10-10')
        and (batch.data -> a.id::text ->> 'future_installments')::numeric = card_unbilled_installments(a.id, '2026-10-10')
        and (batch.data -> a.id::text ->> 'unpaid')::numeric = card_statement_unpaid(a.id, '2026-10-07', '2026-10-10')
      ) as matches from accounts a cross join batch where a.type = 'credit_card'
    `);
    expect(result.rows[0].matches).toBe(true);
  } finally {
    await db.exec("rollback");
  }
});

describe("metas de ahorro", () => {
  it("aparta y libera dinero que ya está en la cuenta vinculada sin mover su saldo", async () => {
    await db.exec("begin");
    const account = "00000000-0000-4000-8000-000000000021";
    const linkedGoal = "00000000-0000-4000-8000-000000000022";
    await db.query("insert into accounts(id,household_id,created_by,name,type,opening_balance) values ($1,$2,$3,'MULTIMONEY','savings',400)", [account, home, user]);
    await db.query("insert into savings_goals(id,household_id,created_by,name,type,target_amount,account_id) values ($1,$2,$3,'Viaje','goal',500,$4)", [linkedGoal, home, user, account]);
    await db.query("select savings_goal_operation($1,'goal_contribution',200,'2026-10-01',$2)", [linkedGoal, account]);
    const balance = await db.query<{ balance: string }>("select balance::text from account_balances() where account_id=$1", [account]);
    expect(Number(balance.rows[0].balance)).toBe(400);
    const reserved = await db.query<{ total: string }>("select sum(amount)::text total from transactions where savings_goal_id=$1", [linkedGoal]);
    expect(Number(reserved.rows[0].total)).toBe(200);
    await db.query("select savings_goal_operation($1,'goal_withdrawal',50,'2026-10-02',$2)", [linkedGoal, account]);
    expect(Number((await db.query<{ balance: string }>("select balance::text from account_balances() where account_id=$1", [account])).rows[0].balance)).toBe(400);
    const other = "00000000-0000-4000-8000-000000000023";
    await db.query("insert into accounts(id,household_id,created_by,name,type,opening_balance) values ($1,$2,$3,'Efectivo','cash',100)", [other, home, user]);
    await db.query("select savings_goal_operation($1,'goal_contribution',25,'2026-10-03',$2)", [linkedGoal, other]);
    const balances = await db.query<{ account_id: string; balance: string }>("select account_id,balance::text from account_balances() where account_id in ($1,$2)", [account, other]);
    expect(Object.fromEntries(balances.rows.map((row) => [row.account_id, Number(row.balance)]))).toEqual({ [account]: 425, [other]: 75 });
    await expect(db.query("select savings_goal_operation($1,'goal_withdrawal',500,'2026-10-04',$2)", [linkedGoal, account])).rejects.toThrow("El retiro supera el dinero apartado");
    await db.exec("rollback");
  });
  it("aporta y retira (regresión: `amount` sin calificar en el guardián)", async () => {
    await move("goal_contribution", 10);
    await move("goal_withdrawal", 4);
    await expect(move("goal_withdrawal", 7)).rejects.toThrow("El retiro supera el dinero apartado");
  });
});

describe("catálogo base y orden", () => {
  it("al crear el admin se siembran los 4 métodos de pago, sin duplicar", async () => {
    const r = await db.query<{ type: string }>(
      "select type::text from payment_methods where household_id=$1 order by type",
      [home],
    );
    expect(r.rows.map((x) => x.type)).toEqual(["cash", "credit", "debit", "transfer"]);
    await db.query("select seed_payment_methods($1,$2)", [home, user]);
    const again = await db.query<{ n: number }>("select count(*)::int n from payment_methods where household_id=$1", [home]);
    expect(again.rows[0].n).toBe(4);
  });
  it("las tarjetas van primero", async () => {
    await db.exec(`
      insert into accounts(household_id,created_by,name,type,opening_balance) values
        ('${home}','${user}','Ahorro','savings',0);
      insert into accounts(household_id,created_by,name,type,opening_balance,credit_limit,statement_closing_day,payment_due_day)
        values ('${home}','${user}','Visa','credit_card',0,1000,7,25);
    `);
    const r = await db.query<{ name: string }>(
      "select name from accounts where household_id=$1 order by sort_rank, name",
      [home],
    );
    expect(r.rows[0].name).toBe("Visa");
  });
});

describe("personas de préstamos", () => {
  it("agrupa los préstamos en ambas direcciones y permite vincular los anteriores sin crear abonos", async () => {
    await db.exec("begin");
    try {
      const person = (await db.query<{ id: string }>(
        "insert into loan_people(household_id,name) values ($1,'Ana') returning id",
        [home],
      )).rows[0].id;
      const account = (await db.query<{ id: string }>(
        "insert into accounts(household_id,created_by,name,type,opening_balance) values ($1,$2,'Caja','cash',100) returning id",
        [home, user],
      )).rows[0].id;
      await db.query("select loan_create_for_person($1,'lent',25,'2026-10-01',p_account_id => $2)", [person, account]);
      const old = (await db.query<{ id: string }>("select debt_create('Ana anterior',15,'2026-10-01') id")).rows[0].id;
      await db.query("select loan_set_person($1,$2)", [old, person]);
      await db.query("select loan_create_for_person($1,'borrowed',10,'2026-10-01')", [person]);
      const { rows } = await db.query<{ snapshot: { person_id: string; direction: string; pending: number; debtor: string }[] }>(
        "select loan_snapshot('loans') snapshot",
      );
      expect(rows[0].snapshot.filter((loan) => loan.person_id === person)).toEqual(expect.arrayContaining([
        expect.objectContaining({ direction: "lent", pending: 25, debtor: "Ana" }),
        expect.objectContaining({ direction: "borrowed", pending: 15, debtor: "Ana anterior" }),
        expect.objectContaining({ direction: "borrowed", pending: 10, debtor: "Ana" }),
      ]));
      const movements = await db.query<{ count: number }>("select count(*)::int count from transactions where loan_id=$1", [old]);
      expect(movements.rows[0].count).toBe(0);
      const otherHome = (await db.query<{ id: string }>("insert into households(name) values ('Otro hogar') returning id")).rows[0].id;
      const otherPerson = (await db.query<{ id: string }>(
        "insert into loan_people(household_id,name) values ($1,'Persona de otro hogar') returning id",
        [otherHome],
      )).rows[0].id;
      await db.exec("set local role authenticated; savepoint cross_household");
      const people = await db.query<{ id: string }>("select id from loan_people");
      expect(people.rows).toEqual([{ id: person }]);
      const customized = await db.query<{ emoji: string; color: string }>(
        "update loan_people set emoji='🦊', color='#db2777' where id=$1 returning emoji,color",
        [person],
      );
      expect(customized.rows).toEqual([{ emoji: "🦊", color: "#db2777" }]);
      const foreignUpdate = await db.query("update loan_people set color='#16a34a' where id=$1 returning id", [otherPerson]);
      expect(foreignUpdate.rows).toEqual([]);
      await expect(db.query("select loan_set_person($1,$2)", [old, otherPerson])).rejects.toThrow("Persona no disponible");
      await db.exec("rollback to cross_household");
      await db.query("select loan_set_person($1,null)", [old]);
      const unlinked = await db.query<{ snapshot: { id: string; person_id: string | null }[] }>("select loan_snapshot('loans') snapshot");
      expect(unlinked.rows[0].snapshot.find((loan) => loan.id === old)?.person_id).toBeNull();
    } finally {
      await db.exec("rollback");
    }
  });
});

describe("reservas de fondos", () => {
  it("«Ya lo compré» usa lo apartado y reinicia el ciclo con la misma duración", async () => {
    const p = "00000000-0000-4000-8000-000000000010";
    await db.exec(`
      insert into savings_goals(id,household_id,created_by,name,type,target_amount,target_date,cadence,cycle_start)
        values ('${p}','${home}','${user}','Detergente grande','provision',25,'2026-12-01','quincenal','2026-09-01');
      insert into transactions(household_id,created_by,type,amount,date,savings_goal_id)
        values ('${home}','${user}','goal_contribution',20,'2026-09-15','${p}');
      insert into accounts(id,household_id,created_by,name,type,opening_balance)
        values ('00000000-0000-4000-8000-000000000011','${home}','${user}','Billetera','cash',500);
      update accounts set created_at='2026-09-01T00:00:00Z' where id='00000000-0000-4000-8000-000000000011';
    `);
    const cat = (await db.query<{ id: string }>("select id from categories where household_id=$1 and type='expense' limit 1", [home])).rows[0].id;
    const tx = (
      await db.query<{ id: string }>(
        `insert into transactions(household_id,created_by,type,amount,date,account_id,category_id,description)
         values ($1,$2,'expense',24,'2026-10-10','00000000-0000-4000-8000-000000000011',$3,'Detergente') returning id`,
        [home, user, cat],
      )
    ).rows[0].id;
    await db.query("select provision_restart($1,$2)", [p, tx]);
    const g = (
      await db.query<{ cycle_start: string; target_date: string; last_purchase_transaction_id: string; bal: string }>(
        `select cycle_start::text, target_date::text, last_purchase_transaction_id,
           (select sum(case when type='goal_contribution' then amount else -amount end) from transactions where savings_goal_id=g.id)::text bal
         from savings_goals g where id=$1`,
        [p],
      )
    ).rows[0];
    expect(g).toEqual({ cycle_start: "2026-10-10", target_date: "2027-01-09", last_purchase_transaction_id: tx, bal: "0.00" });
  });
});

describe("deudas que debo", () => {
  const cash = "00000000-0000-4000-8000-000000000011";
  const balance = async () =>
    Number((await db.query<{ b: string }>("select balance::text b from account_balances() where account_id=$1", [cash])).rows[0].b);
  const worth = async () => {
    const r = await db.query<{ s: { netWorth: { balance: number }[] } }>(
      "select analytics_snapshot('2026-10-01','2026-10-31','dashboard') s",
    );
    return Number(r.rows[0].s.netWorth.at(-1)!.balance);
  };

  it("crear no mueve dinero; resta del patrimonio; abonar sale de la cuenta y liquida", async () => {
    const before = { cash: await balance(), worth: await worth() };
    const id = (await db.query<{ id: string }>("select debt_create('Hermano',80,'2026-10-01',null,'Entrada del concierto') id")).rows[0].id;
    expect(await balance()).toBe(before.cash);
    expect(await worth()).toBeCloseTo(before.worth - 80);

    await db.query("select debt_pay($1,30,'2026-10-05',$2)", [id, cash]);
    expect(await balance()).toBeCloseTo(before.cash - 30);
    // Pagar baja la cuenta y la deuda por igual: el patrimonio queda igual que antes del abono.
    expect(await worth()).toBeCloseTo(before.worth - 80);
    let loan = (await db.query<{ recovered_amount: string; status: string }>("select recovered_amount::text, status from loans where id=$1", [id])).rows[0];
    expect(loan).toEqual({ recovered_amount: "30.00", status: "active" });

    await db.query("select debt_pay($1,50,'2026-10-06',$2)", [id, cash]);
    loan = (await db.query<{ recovered_amount: string; status: string }>("select recovered_amount::text, status from loans where id=$1", [id])).rows[0];
    expect(loan).toEqual({ recovered_amount: "80.00", status: "paid" });
    expect(await worth()).toBeCloseTo(before.worth - 80);

    await expect(db.query("select debt_pay($1,1,'2026-10-07',$2)", [id, cash])).rejects.toThrow();
    await expect(db.query("select loan_repay($1,5,'2026-10-07',$2)", [id, cash])).rejects.toThrow("Préstamo no disponible");
    const snap = (await db.query<{ s: { id: string; direction: string; pending: number }[] }>("select loan_snapshot('loans') s")).rows[0].s;
    expect(snap.find((l) => l.id === id)).toMatchObject({ direction: "borrowed", pending: 0 });
  });
});

describe("abonos a una compra de la tarjeta", () => {
  const card = "00000000-0000-4000-8000-000000000021",
    bank = "00000000-0000-4000-8000-000000000022";
  const cardDebt = async () =>
    Number((await db.query<{ b: string }>("select balance::text b from account_balances() where account_id=$1", [card])).rows[0].b);
  const paidOn = async (track: string) =>
    Number((await db.query<{ p: string }>("select coalesce(sum(amount),0)::text p from card_purchase_track_payments where track_id=$1", [track])).rows[0].p);

  it("sigue una compra, le abona con pagos reales a la tarjeta y no deja pasarse", async () => {
    await db.exec(`
      insert into accounts(id,household_id,created_by,name,type,opening_balance,credit_limit,statement_closing_day,payment_due_day)
        values ('${card}','${home}','${user}','Visa TV','credit_card',0,2000,7,25);
      insert into accounts(id,household_id,created_by,name,type,opening_balance)
        values ('${bank}','${home}','${user}','Ahorro','checking',1000);
    `);
    const cat = (await db.query<{ id: string }>("select id from categories where household_id=$1 and type='expense' limit 1", [home])).rows[0].id;
    const tx = (
      await db.query<{ id: string }>(
        `insert into transactions(household_id,created_by,type,amount,date,account_id,category_id,description)
         values ($1,$2,'expense',600,'2026-10-01',$3,$4,'Televisor') returning id`,
        [home, user, card, cat],
      )
    ).rows[0].id;
    const track = (await db.query<{ id: string }>("select track_card_purchase($1) id", [tx])).rows[0].id;
    expect((await db.query<{ id: string }>("select track_card_purchase($1) id", [tx])).rows[0].id).toBe(track);
    const debt0 = await cardDebt();

    const p1 = "00000000-0000-4000-8000-000000000031";
    await db.query("select pay_tracked_purchase($1,$2,'2026-10-02',$3,200)", [p1, track, bank]);
    await db.query("select pay_tracked_purchase($1,$2,'2026-10-02',$3,200)", [p1, track, bank]); // doble toque
    await db.query("select pay_tracked_purchase($1,$2,'2026-10-03',$3,300)", ["00000000-0000-4000-8000-000000000032", track, bank]);
    expect(await paidOn(track)).toBe(500);
    expect(await cardDebt()).toBeCloseTo(debt0 - 500);
    await expect(
      db.query("select pay_tracked_purchase($1,$2,'2026-10-04',$3,150)", ["00000000-0000-4000-8000-000000000033", track, bank]),
    ).rejects.toThrow("El abono supera lo que falta de esta compra");

    await db.query("select untrack_card_purchase($1)", [track]);
    const left = await db.query<{ n: number }>("select count(*)::int n from card_payments where id in ($1,'00000000-0000-4000-8000-000000000032')", [p1]);
    expect(left.rows[0].n).toBe(2);
    expect(await cardDebt()).toBeCloseTo(debt0 - 500);
  });

  it("solo se pueden seguir gastos hechos con tarjeta", async () => {
    const cat = (await db.query<{ id: string }>("select id from categories where household_id=$1 and type='expense' limit 1", [home])).rows[0].id;
    const tx = (
      await db.query<{ id: string }>(
        `insert into transactions(household_id,created_by,type,amount,date,account_id,category_id,description)
         values ($1,$2,'expense',10,'2026-10-01',$3,$4,'Café') returning id`,
        [home, user, bank, cat],
      )
    ).rows[0].id;
    await expect(db.query("select track_card_purchase($1)", [tx])).rejects.toThrow("Elige un gasto hecho con esta tarjeta");
  });
});

describe("préstamos de compras", () => {
  it("comparte unidades entre personas y concilia abonos parciales sin duplicar la compra", async () => {
    await db.exec("begin");
    try {
      const [ana, leo] = (
        await db.query<{ id: string }>(
          "insert into loan_people(household_id,name) values ($1,'Ana compras'),($1,'Leo compras') returning id",
          [home],
        )
      ).rows.map((row) => row.id);
      const account = (
        await db.query<{ id: string }>(
          "insert into accounts(household_id,created_by,name,type,opening_balance) values ($1,$2,'Caja compras','cash',100) returning id",
          [home, user],
        )
      ).rows[0].id;
      const item = "00000000-0000-4000-8000-000000000031";
      const second = "00000000-0000-4000-8000-000000000032";
      const category = (
        await db.query<{ id: string }>(
          "select id from categories where household_id=$1 and type='expense' limit 1",
          [home],
        )
      ).rows[0].id;
      const purchases = (
        await db.query<{ id: string }>(
          "insert into transactions(household_id,created_by,type,amount,date,account_id,purchase_items,category_id) values ($1,$2,'expense',20,'2026-11-01',$3,$4,$6),($1,$2,'expense',3,'2026-11-01',$3,$5,$6) returning id",
          [
            home,
            user,
            account,
            JSON.stringify([
              { id: item, name: "Pasta", quantity: 4, unitCents: 500 },
            ]),
            JSON.stringify([
              { id: second, name: "Salsa", quantity: 1, unitCents: 300 },
            ]),
            category,
          ],
        )
      ).rows;
      const create = (person: string, quantity: number, both = false) =>
        db.query<{ id: string }>(
          "select loan_create_from_purchases($1,'2026-11-01',null,null,$2) id",
          [
            person,
            JSON.stringify([
              { purchase_id: purchases[0].id, item_id: item, quantity },
              ...(both
                ? [
                    {
                      purchase_id: purchases[1].id,
                      item_id: second,
                      quantity: 1,
                    },
                  ]
                : []),
            ]),
          ],
        );
      const loan = (await create(ana, 2, true)).rows[0].id;
      await create(leo, 2);
      await db.exec("savepoint overassign");
      await expect(create(leo, 1)).rejects.toThrow(
        "supera las unidades disponibles",
      );
      await db.exec("rollback to overassign");

      const allocations = (
        await db.query<{ id: string; name: string }>(
          "select id,name from loan_purchase_items where loan_id=$1 order by name",
          [loan],
        )
      ).rows;
      const partial = (
        await db.query<{ id: string }>(
          "select loan_repay_items($1,'2026-11-02',$2,$3) id",
          [
            loan,
            account,
            JSON.stringify([
              { loan_item_id: allocations[0].id, amount_cents: 250 },
              { loan_item_id: allocations[1].id, amount_cents: 300 },
            ]),
          ],
        )
      ).rows[0].id;
      const state = () =>
        db.query<{ amount: string; recovered: string; balance: string }>(
          "select amount::text, recovered_amount::text recovered, (select balance::text from account_balances() where account_id=$2) balance from loans where id=$1",
          [loan, account],
        );
      expect((await state()).rows[0]).toEqual({
        amount: "13.00",
        recovered: "5.50",
        balance: "82.50",
      });
      await db.exec("savepoint overpay");
      await expect(
        db.query("select loan_repay_items($1,'2026-11-02',$2,$3)", [
          loan,
          account,
          JSON.stringify([
            { loan_item_id: allocations[0].id, amount_cents: 751 },
          ]),
        ]),
      ).rejects.toThrow("supera lo pendiente");
      await db.exec("rollback to overpay");
      await db.query("delete from transactions where id=$1", [partial]);
      expect((await state()).rows[0]).toEqual({
        amount: "13.00",
        recovered: "0.00",
        balance: "77.00",
      });
      expect(
        (
          await db.query(
            "select 1 from loan_item_repayments where transaction_id=$1",
            [partial],
          )
        ).rows,
      ).toHaveLength(0);
    } finally {
      await db.exec("rollback");
    }
  });
});
it("copia los renglones comprados de una lista al movimiento del ticket", async () => {
  await db.exec("begin");
  try {
    const category = (await db.query<{ id: string }>(
      "select id from categories where household_id=$1 and type='expense' limit 1", [home],
    )).rows[0].id;
    const account = (await db.query<{ id: string }>(
      "insert into accounts(household_id,created_by,name,type) values ($1,$2,'Caja lista','cash') returning id",
      [home, user],
    )).rows[0].id;
    const list = (await db.query<{ id: string }>(
      "insert into shopping_lists(household_id,created_by,name) values ($1,$2,'Compra compartida') returning id",
      [home, user],
    )).rows[0].id;
    const item = (await db.query<{ id: string }>(
      "insert into shopping_list_items(household_id,created_by,list_id,name,quantity,real_price,checked) values ($1,$2,$3,'Café',2,3.25,true) returning id",
      [home, user, list],
    )).rows[0].id;
    const receipt = (await db.query<{ result: { transaction_id: string } }>(
      "select record_shopping_purchase($1,null,array[$2::uuid],$3,$4,'2026-11-01',null,gen_random_uuid()) result",
      [list, item, account, category],
    )).rows[0].result;
    const stored = await db.query<{ purchase_items: unknown }>(
      "select purchase_items from transactions where id=$1", [receipt.transaction_id],
    );
    expect(stored.rows[0].purchase_items).toEqual([{ id: item, name: "Café", quantity: 2, unitCents: 325 }]);
  } finally {
    await db.exec("rollback");
  }
});
