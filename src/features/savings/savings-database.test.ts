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

describe("metas de ahorro", () => {
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
