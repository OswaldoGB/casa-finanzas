import { PGlite } from "@electric-sql/pglite";
import { readFile, access } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, expect, it } from "vitest";

let db: PGlite;
const home = randomUUID(), user = randomUUID(), account = randomUUID(), category = randomUUID();
const legacy = randomUUID(), legacyTx = randomUUID();
beforeAll(async () => {
  db = new PGlite();
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
  const original = await readFile("supabase/migrations/20260927000013_home.sql", "utf8");
  await db.exec(original.slice(0, original.indexOf("do $$ declare t")));
  await db.exec(original.slice(original.indexOf("create function public.validate_purchase_refs"), original.indexOf("-- Cierre", original.indexOf("create function public.validate_purchase_refs")) > 0 ? original.indexOf("-- Cierre", original.indexOf("create function public.validate_purchase_refs")) : original.indexOf("create function public.close_shopping_list")));
  await db.exec(await readFile("supabase/migrations/20261003000035_transaction_delete_dependencies.sql", "utf8"));
  await db.exec(`alter table shopping_lists add column completed_at timestamptz;
    insert into transactions(id,household_id,created_by,type,amount,date,account_id,category_id) values('${legacyTx}','${home}','${user}','expense',10,'2026-10-01','${account}','${category}');
    insert into shopping_lists(id,household_id,created_by,name,store,status,transaction_id) values('${legacy}','${home}','${user}','Original','Selectos','completed','${legacyTx}');
    insert into shopping_list_items(household_id,created_by,list_id,name,real_price,checked) values('${home}','${user}','${legacy}','Comprado',10,true),('${home}','${user}','${legacy}','No comprado',2,false);`);
  await db.exec(original.slice(original.indexOf("create function public.guard_shopping_list_item"),original.indexOf("-- Comprobar referencias" )).replace("create function public.guard_home_purchase", "create or replace function public.guard_home_purchase"));
  const migration = "supabase/migrations/20261014000043_shopping_groups_and_purchases.sql";
  if (await access(migration).then(() => true, () => false)) await db.exec(await readFile(migration,"utf8"));
}, 30000);
afterAll(async () => { await db?.close(); });
const rows = async <T>(sql:string,args:unknown[] = []) => (await db.query<T>(sql,args)).rows;
async function fixture() {
  const list=randomUUID(), group=randomUUID(), other=randomUUID(), item=randomUUID(), remaining=randomUUID();
  await db.exec(`insert into shopping_lists(id,household_id,created_by,name) values('${list}','${home}','${user}','Playa');
    insert into shopping_list_groups(id,household_id,created_by,list_id,name) values('${group}','${home}','${user}','${list}','Selectos'),('${other}','${home}','${user}','${list}','PriceSmart');
    insert into shopping_list_items(id,household_id,created_by,list_id,group_id,name,quantity,real_price,checked) values('${item}','${home}','${user}','${list}','${group}','Leche',1.5,2.25,true),('${remaining}','${home}','${user}','${list}','${other}','Carne',1,20,false);`);
  return {list,group,other,item,remaining};
}
async function pay(f:Awaited<ReturnType<typeof fixture>>, key=randomUUID(), ids=[f.item]) {
  return (await rows<{result:{purchase_id:string;transaction_id:string}}>("select record_shopping_purchase($1,$2,$3,$4,$5,'2026-10-14',null,$6) result",[f.list,f.group,ids,account,category,key]))[0].result;
}
it("migrates a historical payment without reopening unchecked products",async()=>{
  expect(await rows("select amount from transactions where id=$1",[legacyTx])).toEqual([{amount:"10.00"}]);
  expect(await rows("select status from shopping_lists where id=$1",[legacy])).toEqual([{status:"completed"}]);
  expect(await rows("select count(*)::int n from shopping_list_purchases where list_id=$1",[legacy])).toEqual([{n:1}]);
  expect(await rows("select resolution from shopping_list_items where list_id=$1 and not checked",[legacy])).toEqual([{resolution:"legacy_unbought"}]);
});
it("pays one store once, rounds cents and leaves the other pending",async()=>{
  const f=await fixture(), key=randomUUID();
  const first=await pay(f,key);
  expect(await pay(f,key)).toEqual(first);
  expect(await rows("select amount from transactions where id=$1",[first.transaction_id])).toEqual([{amount:"3.38"}]);
  expect(await rows("select purchase_id from shopping_list_items where id=$1",[f.remaining])).toEqual([{purchase_id:null}]);
  await expect(pay(f)).rejects.toThrow();
  expect(await rows("select status from shopping_lists where id=$1",[f.list])).toEqual([{status:"open"}]);
});
it("rejects mixed stores, missing prices, duplicate ids and insufficient permissions",async()=>{
  const f=await fixture();
  await expect(pay(f,randomUUID(),[f.item,f.remaining])).rejects.toThrow();
  await expect(pay(f,randomUUID(),[f.item,f.item])).rejects.toThrow();
  await db.query("update shopping_list_items set real_price=null where id=$1",[f.item]);
  await expect(pay(f)).rejects.toThrow();
  await db.exec("select set_config('app.denied','transactions',false)");
  await expect(pay(f)).rejects.toThrow();
  await db.exec("select set_config('app.denied','',false)");
});
it("deleting one purchase restores only its items",async()=>{
  const f=await fixture();
  const purchase=await pay(f);
  await db.query("select delete_transaction_with_dependencies($1)",[purchase.transaction_id]);
  expect(await rows("select purchase_id,checked from shopping_list_items where id=$1",[f.item])).toEqual([{purchase_id:null,checked:true}]);
  expect(await rows("select checked from shopping_list_items where id=$1",[f.remaining])).toEqual([{checked:false}]);
  expect(await rows("select count(*)::int n from shopping_list_purchases where list_id=$1",[f.list])).toEqual([{n:0}]);
});
it("rejects changing a paid breakdown or reusing an operation for different items",async()=>{
  const f=await fixture(), key=randomUUID();
  await pay(f,key);
  await expect(db.query("update shopping_list_items set quantity=9 where id=$1",[f.item])).rejects.toThrow();
  await expect(pay(f,key,[f.remaining])).rejects.toThrow();
});
