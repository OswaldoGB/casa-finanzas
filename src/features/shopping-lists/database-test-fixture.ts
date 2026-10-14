import { PGlite } from "@electric-sql/pglite";
import { readFile, access } from "node:fs/promises";
export async function createShoppingDatabase(ids:{home:string;user:string;account:string;category:string;legacy:string;legacyTx:string}) {
const {home,user,account,category,legacy,legacyTx}=ids;

  const db = new PGlite();
  await db.exec(`
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$select '${user}'::uuid$$;
    create table households(id uuid primary key,timezone text);
    create table profiles(id uuid,household_id uuid,unique(id,household_id));
    create table accounts(id uuid primary key,household_id uuid,is_archived boolean default false);
    create table categories(id uuid primary key,household_id uuid,type text,is_archived boolean default false);
    create table payment_methods(id uuid primary key,household_id uuid,is_archived boolean default false);
    create table transactions(id uuid primary key default gen_random_uuid(),household_id uuid,created_by uuid,type text,status text default 'posted',amount numeric(14,2),date date,account_id uuid,category_id uuid,payment_method_id uuid,project_id uuid,description text,unique(id,household_id));
    create table recurring_rules(project_id uuid,household_id uuid);
    select set_config('app.home','${home}',false);
    create function current_household_id() returns uuid language sql as $$select current_setting('app.home')::uuid$$;
    create function has_module_access(text,text) returns boolean language sql as $$select coalesce(current_setting('app.denied',true),'') <> $1$$;
    create function assert_transactions_unfinanced(uuid[]) returns void language plpgsql as $$begin end$$;
    create function set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
    insert into households values('${home}','America/El_Salvador');
    insert into profiles values('${user}','${home}');
    insert into accounts values('${account}','${home}',false);
    insert into categories values('${category}','${home}','expense',false);
  `);
  const original = await readFile(
    "supabase/migrations/20260927000013_home.sql",
    "utf8",
  );
  await db.exec(original.slice(0, original.indexOf("do $$ declare t")));
  await db.exec(
    original.slice(
      original.indexOf("create function public.validate_purchase_refs"),
      original.indexOf(
        "-- Cierre",
        original.indexOf("create function public.validate_purchase_refs"),
      ) > 0
        ? original.indexOf(
            "-- Cierre",
            original.indexOf("create function public.validate_purchase_refs"),
          )
        : original.indexOf("create function public.close_shopping_list"),
    ),
  );
  await db.exec(
    await readFile(
      "supabase/migrations/20261003000035_transaction_delete_dependencies.sql",
      "utf8",
    ),
  );
  await db.exec(`alter table shopping_lists add column completed_at timestamptz;
    insert into transactions(id,household_id,created_by,type,amount,date,account_id,category_id) values('${legacyTx}','${home}','${user}','expense',10,'2026-10-01','${account}','${category}');
    insert into shopping_lists(id,household_id,created_by,name,store,status,transaction_id) values('${legacy}','${home}','${user}','Original','Selectos','completed','${legacyTx}');
    insert into shopping_list_items(household_id,created_by,list_id,name,real_price,checked) values('${home}','${user}','${legacy}','Comprado',10,true),('${home}','${user}','${legacy}','No comprado',2,false);`);
  await db.exec(
    original
      .slice(
        original.indexOf("create function public.guard_shopping_list_item"),
        original.indexOf("-- Comprobar referencias"),
      )
      .replace(
        "create function public.guard_home_purchase",
        "create or replace function public.guard_home_purchase",
      ),
  );
  const migration =
    "supabase/migrations/20261014000043_shopping_groups_and_purchases.sql";
  if (
    await access(migration).then(
      () => true,
      () => false,
    )
  )
    await db.exec(await readFile(migration, "utf8"));

return db;
}
