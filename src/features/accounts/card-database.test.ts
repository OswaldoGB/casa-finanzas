import { PGlite } from "@electric-sql/pglite";
import { readFile, access } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

// A fresh PostgreSQL database: no network, credentials or household data.
describe("card payment database integration", () => {
  let db: PGlite;
  const home = randomUUID(),
    user = randomUUID(),
    card = randomUUID(),
    source = randomUUID(),
    plan = randomUUID();
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$ select '${user}'::uuid $$;
      create table households(id uuid primary key, timezone text);
      create table profiles(id uuid, household_id uuid, role text, unique(id,household_id));
      create table accounts(id uuid primary key, household_id uuid, name text, type text, opening_balance numeric, statement_closing_day int, is_archived boolean default false, payment_due_day int default 30, unique(id,household_id));
      create table card_payments(id uuid primary key, household_id uuid, created_by uuid, card_id uuid, date date, created_at timestamptz default now(), unique(id,household_id));
      create table transactions(id uuid primary key default gen_random_uuid(), household_id uuid, created_by uuid, type text, status text default 'posted', amount numeric, date date, account_id uuid, destination_account_id uuid, category_id uuid, description text, card_payment_id uuid, unique(id,household_id), foreign key(card_payment_id,household_id) references card_payments(id,household_id));
      create table attachments(id uuid primary key default gen_random_uuid(), household_id uuid, created_by uuid, transaction_id uuid, storage_path text, mime_type text, size_bytes bigint, created_at timestamptz default now(), updated_at timestamptz default now(), foreign key(transaction_id,household_id) references transactions(id,household_id) on delete cascade, check(storage_path like household_id::text||'/'||transaction_id::text||'/%'));
      create table card_installment_plans(id uuid primary key, household_id uuid, card_id uuid, first_close date, installments smallint, paid_installments smallint default 0, amount numeric, original_amount numeric, created_by uuid, name text, purchase_date date, transaction_id uuid, unique(id,household_id));
      create table categories(id uuid, household_id uuid, type text, is_archived boolean);
      create table schedule(plan_id uuid, card_id uuid, installment smallint, close_date date, due_date date, amount numeric);
      select set_config('app.household','${home}',false);
      create function current_household_id() returns uuid language sql as $$ select nullif(current_setting('app.household',true),'')::uuid $$;
      create function has_module_access(text,text) returns boolean language sql as $$ select true $$;
      create function can_read_accounts() returns boolean language sql as $$ select public.current_household_id() is not null $$;
      create function account_balance_on(p_account_id uuid,p_date date) returns numeric language sql as $$
        select a.opening_balance + coalesce(sum(case when a.type='credit_card' then case when t.destination_account_id=a.id then -t.amount else t.amount end else case when t.account_id=a.id then -t.amount else t.amount end end),0) from public.accounts a left join public.transactions t on (t.account_id=a.id or t.destination_account_id=a.id) and t.date<=p_date where a.id=p_account_id group by a.id,a.opening_balance $$;
      create function card_unbilled_installments(uuid,date) returns numeric language sql as $$ select 0::numeric $$;
      create function card_installment_schedule(p_card_id uuid,p_after date,p_until date) returns table(plan_id uuid,card_id uuid,installment integer,close_date date,due_date date,amount numeric) language sql as $$ select s.plan_id,s.card_id,s.installment::integer,s.close_date,s.due_date,s.amount from public.schedule s where s.card_id=p_card_id and close_date>p_after and close_date<=p_until and public.can_read_accounts() $$;
      insert into households values('${home}','America/El_Salvador');
      insert into profiles values('${user}','${home}','admin');
      insert into accounts(id,household_id,name,type,opening_balance,statement_closing_day) values('${card}','${home}','Test card','credit_card',1000,7),('${source}','${home}','Test bank','checking',2000,null);
      insert into card_installment_plans(id,household_id,card_id,first_close,installments,amount) values('${plan}','${home}','${card}','2026-09-07',1,20);
      create schema storage;
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      create function storage.foldername(text) returns text[] language sql as $$ select (string_to_array($1,'/'))[1:2] $$;
      alter table storage.objects enable row level security;
      grant usage on schema storage to authenticated;
      grant select,delete on storage.objects to authenticated;
      grant select on public.transactions,public.attachments to authenticated;
      create policy receipts_read on storage.objects for select to authenticated using(bucket_id='receipts' and exists(select 1 from public.transactions t where t.household_id=public.current_household_id() and t.household_id::text=(storage.foldername(name))[1] and t.id::text=(storage.foldername(name))[2]));
      create policy receipts_delete on storage.objects for delete to authenticated using(bucket_id='receipts' and exists(select 1 from public.transactions t where t.household_id=public.current_household_id() and t.household_id::text=(storage.foldername(name))[1] and t.id::text=(storage.foldername(name))[2]));
    `);
    const old = await readFile(
      "supabase/migrations/20260928000022_card_installments.sql",
      "utf8",
    );
    await db.exec(
      old.slice(
        old.indexOf("create function public.create_card_installment("),
        old.indexOf("create function public.remove_card_installment("),
      ),
    );
    const progress = await readFile(
      "supabase/migrations/20260928000025_installment_progress.sql",
      "utf8",
    );
    await db.exec(
      progress.slice(
        progress.indexOf(
          "create function public.create_card_installment_with_progress(",
        ),
        progress.indexOf(
          "create or replace function public.card_installment_schedule(",
        ),
      ),
    );
    await db.exec(
      old.slice(
        old.indexOf("create function public.pay_credit_card("),
        old.indexOf("-- Evita que editar"),
      ),
    );
    await db.exec(
      await readFile(
        "supabase/migrations/20261008000037_card_statement_reconciliation.sql",
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        "supabase/migrations/20261008000038_card_payment_allocation_atomic.sql",
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        "supabase/migrations/20261009000039_card_statement_installment_settlement.sql",
        "utf8",
      ),
    );
    const legacy = randomUUID(),
      legacyPayment = randomUUID();
    await db.query(
      "select upsert_card_statement($1,$2,'2026-09-07','2026-09-30',40,'')",
      [legacy, card],
    );
    await db.query("select pay_credit_card_and_settle($1,$2,'2026-09-08',$3)", [
      legacyPayment,
      card,
      JSON.stringify([{ account_id: source, amount: 10 }]),
    ]);
    await db.query("select set_config('app.household','',false)");
    const fix = "supabase/migrations/20261009000040_credit_card_flow.sql";
    if (
      await access(fix).then(
        () => true,
        () => false,
      )
    )
      await db.exec(await readFile(fix, "utf8"));
    await db.query("select set_config('app.household',$1,false)", [home]);
  }, 30000);
  afterAll(async () => {
    await db?.close();
  });
  const query = async <T>(sql: string, args: unknown[] = []) =>
    (await db.query<T>(sql, args)).rows;
  const clean = async () => {
    await db.exec(
      `truncate attachments,card_payments,card_statements,transactions,card_statement_installments,card_statement_allocations,card_installment_payment_allocations,schedule,storage.objects; update accounts set opening_balance=1000 where id='${card}'; update card_installment_plans set first_close='2099-09-07',installments=1,amount=20;`,
    );
  };
  const statement = async (close: string, amount = 40) => {
    const id = randomUUID();
    await query(
      "select save_card_statement_with_installments($1,$2,$3,$4,$5,'')",
      [id, card, close, close.slice(0, 7) + "-30", amount],
    );
    return id;
  };
  const pay = async (id: string, date: string, amount: number) =>
    query("select pay_credit_card_and_settle($1,$2,$3,$4)", [
      id,
      card,
      date,
      JSON.stringify([{ account_id: source, amount }]),
    ]);

  it("backfills legacy exact quotas with no authenticated household during migration", async () => {
    expect(
      await query(
        "select count(*)::integer as count from card_statement_installments",
      ),
    ).toEqual([{ count: 1 }]);
    expect(
      await query(
        "select sum(amount)::text as paid from card_statement_allocations",
      ),
    ).toEqual([{ paid: "10.00" }]);
    expect(
      await query(
        "select sum(amount)::text as paid from card_installment_payment_allocations",
      ),
    ).toEqual([{ paid: "10.00" }]);
  });
  it("snapshots only the exact cut", async () => {
    await clean();
    await query(
      "insert into schedule values($1,$2,1,'2026-08-07','2026-08-30',20),($1,$2,2,'2026-09-07','2026-09-30',20)",
      [plan, card],
    );
    await query(
      "update card_installment_plans set first_close='2026-08-07',installments=2,amount=40 where id=$1",
      [plan],
    );
    const id = await statement("2026-09-07");
    expect(
      (
        await query<{ installment: number }>(
          "select installment from card_statement_installments where statement_id=$1",
          [id],
        )
      ).map((row) => row.installment),
    ).toEqual([2]);
  });
  it("repairs an incorrectly linked legacy quota only when it has no monetary allocation", async () => {
    await clean();
    await query(
      "update card_installment_plans set first_close='2026-08-07' where id=$1",
      [plan],
    );
    const wrong = await statement("2026-09-07", 20);
    await query(
      "insert into card_statement_installments(household_id,statement_id,plan_id,installment,close_date,due_date,amount) values($1,$2,$3,1,'2026-08-07','2026-09-30',20)",
      [home, wrong, plan],
    );
    const right = await statement("2026-08-07", 20);
    expect(
      await query(
        "select statement_id from card_statement_installments where plan_id=$1",
        [plan],
      ),
    ).toEqual([{ statement_id: right }]);
  });
  it.each([0, 20, 40])(
    "links an imported plan to its already confirmed cut (settled=%s)",
    async (settled) => {
      await clean();
      const state = await statement("2026-09-07", 40),
        imported = randomUUID();
      if (settled) await pay(randomUUID(), "2026-09-08", settled);
      const args = [
        imported,
        card,
        "Imported plan",
        120,
        6,
        2,
        "original",
        "2026-09-01",
        "2026-09-07",
        true,
      ];
      await query(
        "select create_card_installment_with_progress($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        args,
      );
      await query(
        "select create_card_installment_with_progress($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        args,
      );
      expect(
        await query(
          "select statement_id,installment,amount::text from card_statement_installments where plan_id=$1",
          [imported],
        ),
      ).toEqual([{ statement_id: state, installment: 3, amount: "20.00" }]);
      expect(
        await query(
          "select paid_installments from card_installment_plans where id=$1",
          [imported],
        ),
      ).toEqual([{ paid_installments: 2 }]);
      expect(
        await query(
          "select coalesce(sum(a.amount),0)::numeric as paid from card_installment_payment_allocations a join card_statement_installments i on i.id=a.statement_installment_id where i.plan_id=$1",
          [imported],
        ),
      ).toEqual([
        { paid: String(Math.min(settled, 20)) + (settled ? ".00" : "") },
      ]);
      expect(
        await query("select count(*)::integer as count from transactions"),
      ).toEqual([{ count: settled ? 1 : 0 }]);
      await query(
        "delete from card_installment_payment_allocations where statement_installment_id in (select id from card_statement_installments where plan_id=$1)",
        [imported],
      );
      await query("delete from card_statement_installments where plan_id=$1", [
        imported,
      ]);
      await query("delete from card_installment_plans where id=$1", [imported]);
    },
  );
  it("does not allocate a backdated payment to a later cut", async () => {
    await clean();
    await statement("2026-09-07");
    await pay(randomUUID(), "2026-09-06", 40);
    expect(
      await query("select * from card_statement_allocations"),
    ).toHaveLength(0);
  });
  it("does not reuse money retained on an ambiguous legacy quota link", async () => {
    await clean();
    await query(
      "update card_installment_plans set first_close='2026-09-07' where id=$1",
      [plan],
    );
    const state = await statement("2026-09-07", 40),
      payment = randomUUID(),
      legacyPlan = randomUUID();
    await pay(payment, "2026-09-08", 40);
    await query(
      "delete from card_installment_payment_allocations where card_payment_id=$1",
      [payment],
    );
    await query(
      "insert into card_installment_plans(id,household_id,card_id,first_close,installments,amount) values($1,$2,$3,'2026-08-07',1,40)",
      [legacyPlan, home, card],
    );
    const linked = await query<{ id: string }>(
      "insert into card_statement_installments(household_id,statement_id,plan_id,installment,close_date,due_date,amount) values($1,$2,$3,1,'2026-08-07','2026-09-30',40) returning id",
      [home, state, legacyPlan],
    );
    await query(
      "insert into card_installment_payment_allocations(household_id,card_payment_id,statement_installment_id,amount) values($1,$2,$3,40)",
      [home, payment, linked[0].id],
    );
    await query("select card_statement_settlement_snapshot($1)", [state]);
    expect(
      await query(
        "select sum(amount)::text as paid from card_installment_payment_allocations where card_payment_id=$1",
        [payment],
      ),
    ).toEqual([{ paid: "40.00" }]);
  });
  it("accepts a zero bank cut and rejects future bank cuts", async () => {
    await clean();
    await statement("2026-09-07", 0);
    expect(
      await query("select bank_cash_due::text as amount from card_statements"),
    ).toEqual([{ amount: "0.00" }]);
    await expect(statement("2099-09-07", 20)).rejects.toThrow(/futuro/i);
  });
  it("records the bank payment when it exceeds app debt, retaining the actual credit balance", async () => {
    await clean();
    await query("update accounts set opening_balance=20 where id=$1", [card]);
    await statement("2026-09-07", 40);
    await pay(randomUUID(), "2026-09-08", 40);
    expect(
      await query(
        "select account_balance_on($1,'2026-09-08')::text as balance",
        [card],
      ),
    ).toEqual([{ balance: "-20" }]);
    await query("update accounts set opening_balance=1000 where id=$1", [card]);
  });
  it("keeps a retried payment unchanged when a bank state is added later", async () => {
    await clean();
    const id = randomUUID();
    await pay(id, "2026-09-08", 40);
    await statement("2026-09-07");
    await pay(id, "2026-09-08", 40);
    expect(
      await query("select * from card_statement_allocations"),
    ).toHaveLength(0);
    expect(
      await query("select * from transactions where card_payment_id=$1", [id]),
    ).toHaveLength(1);
  });
  it("blocks edits and deletion of an individual funding transfer", async () => {
    await clean();
    const id = randomUUID();
    await pay(id, "2026-09-08", 40);
    await expect(
      query("update transactions set amount=1 where card_payment_id=$1", [id]),
    ).rejects.toThrow(/pago completo/i);
    await expect(
      query("delete from transactions where card_payment_id=$1", [id]),
    ).rejects.toThrow(/pago completo/i);
  });
  it("replaces the full payment atomically, preserving receipts and rolling back invalid sources", async () => {
    await clean();
    const state = await statement("2026-09-07", 40),
      old = randomUUID(),
      replacement = randomUUID();
    await pay(old, "2026-09-08", 40);
    await query(
      "insert into attachments(household_id,created_by,transaction_id,storage_path) select household_id,created_by,id,household_id::text||'/'||id::text||'/receipt.pdf' from transactions where card_payment_id=$1",
      [old],
    );
    await query(
      "insert into storage.objects(bucket_id,name) select 'receipts',storage_path from attachments",
    );
    await expect(
      query("select replace_card_payment($1,$2,$3,$4,$5)", [
        old,
        replacement,
        card,
        "2026-09-08",
        JSON.stringify([{ account_id: source, amount: 3000 }]),
      ]),
    ).rejects.toThrow(/Saldo insuficiente/);
    expect(
      await query("select id from card_payments where id=$1", [old]),
    ).toHaveLength(1);
    await query("select replace_card_payment($1,$2,$3,$4,$5)", [
      old,
      replacement,
      card,
      "2026-09-08",
      JSON.stringify([{ account_id: source, amount: 20 }]),
    ]);
    expect(
      await query("select id from card_payments where id=$1", [old]),
    ).toHaveLength(0);
    expect(
      await query<{ amount: string }>(
        "select amount from card_statement_allocations where statement_id=$1",
        [state],
      ),
    ).toMatchObject([{ amount: "20.00" }]);
    await db.exec("set role authenticated");
    expect(await query("select name from storage.objects")).toHaveLength(1);
    await db.exec("reset role");
  });
  it("redistributes later payments if correcting an earlier payment leaves an older cut pending", async () => {
    await clean();
    const first = await statement("2026-08-07", 40),
      second = await statement("2026-09-07", 50),
      old = randomUUID();
    await pay(old, "2026-08-08", 40);
    await pay(randomUUID(), "2026-09-08", 50);
    await query("select replace_card_payment($1,$2,$3,$4,$5)", [
      old,
      randomUUID(),
      card,
      "2026-08-08",
      JSON.stringify([{ account_id: source, amount: 20 }]),
    ]);
    const allocated = await query<{ statement_id: string; paid: string }>(
      "select statement_id,sum(amount)::text as paid from card_statement_allocations group by statement_id order by statement_id",
    );
    expect(allocated.find((item) => item.statement_id === first)?.paid).toBe(
      "40.00",
    );
    expect(allocated.find((item) => item.statement_id === second)?.paid).toBe(
      "30.00",
    );
  });
  it("uses later wholly unallocated payments when an earlier payment is corrected", async () => {
    await clean();
    const state = await statement("2026-09-07", 40),
      old = randomUUID();
    await pay(old, "2026-09-08", 40);
    await pay(randomUUID(), "2026-09-09", 20);
    await query("select replace_card_payment($1,$2,$3,$4,$5)", [
      old,
      randomUUID(),
      card,
      "2026-09-08",
      JSON.stringify([{ account_id: source, amount: 20 }]),
    ]);
    expect(
      await query(
        "select sum(amount)::text as paid from card_statement_allocations where statement_id=$1",
        [state],
      ),
    ).toEqual([{ paid: "40.00" }]);
  });
});
