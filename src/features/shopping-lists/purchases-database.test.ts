import { PGlite } from "@electric-sql/pglite";
import { createShoppingDatabase } from "./database-test-fixture";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, expect, it } from "vitest";

let db: PGlite;
const home = randomUUID(),
  user = randomUUID(),
  account = randomUUID(),
  category = randomUUID();
const legacy = randomUUID(),
  legacyTx = randomUUID();
beforeAll(async () => {
  db = await createShoppingDatabase({
    home,
    user,
    account,
    category,
    legacy,
    legacyTx,
  });
}, 30000);
afterAll(async () => {
  await db?.close();
});
const rows = async <T>(sql: string, args: unknown[] = []) =>
  (await db.query<T>(sql, args)).rows;
async function fixture() {
  const list = randomUUID(),
    group = randomUUID(),
    other = randomUUID(),
    item = randomUUID(),
    remaining = randomUUID();
  await db.exec(`insert into shopping_lists(id,household_id,created_by,name) values('${list}','${home}','${user}','Playa');
    insert into shopping_list_groups(id,household_id,created_by,list_id,name) values('${group}','${home}','${user}','${list}','Selectos'),('${other}','${home}','${user}','${list}','PriceSmart');
    insert into shopping_list_items(id,household_id,created_by,list_id,group_id,name,quantity,real_price,checked) values('${item}','${home}','${user}','${list}','${group}','Leche',1.5,2.25,true),('${remaining}','${home}','${user}','${list}','${other}','Carne',1,20,false);`);
  return { list, group, other, item, remaining };
}
async function pay(
  f: Awaited<ReturnType<typeof fixture>>,
  key = randomUUID(),
  ids = [f.item],
) {
  return (
    await rows<{ result: { purchase_id: string; transaction_id: string } }>(
      "select record_shopping_purchase($1,$2,$3,$4,$5,'2026-10-14',null,$6) result",
      [f.list, f.group, ids, account, category, key],
    )
  )[0].result;
}
it("migrates a historical payment without reopening unchecked products", async () => {
  expect(
    await rows("select amount from transactions where id=$1", [legacyTx]),
  ).toEqual([{ amount: "10.00" }]);
  expect(
    await rows("select status from shopping_lists where id=$1", [legacy]),
  ).toEqual([{ status: "completed" }]);
  expect(
    await rows(
      "select count(*)::int n from shopping_list_purchases where list_id=$1",
      [legacy],
    ),
  ).toEqual([{ n: 1 }]);
  expect(
    await rows(
      "select resolution from shopping_list_items where list_id=$1 and not checked",
      [legacy],
    ),
  ).toEqual([{ resolution: "legacy_unbought" }]);
});
it("pays one store once, rounds cents and leaves the other pending", async () => {
  const f = await fixture(),
    key = randomUUID();
  const first = await pay(f, key);
  expect(await pay(f, key)).toEqual(first);
  expect(
    await rows("select amount from transactions where id=$1", [
      first.transaction_id,
    ]),
  ).toEqual([{ amount: "3.38" }]);
  expect(
    await rows("select purchase_id from shopping_list_items where id=$1", [
      f.remaining,
    ]),
  ).toEqual([{ purchase_id: null }]);
  await expect(pay(f)).rejects.toThrow();
  expect(
    await rows("select status from shopping_lists where id=$1", [f.list]),
  ).toEqual([{ status: "open" }]);
});
it("rejects mixed stores, missing prices, duplicate ids and insufficient permissions", async () => {
  const f = await fixture();
  await expect(pay(f, randomUUID(), [f.item, f.remaining])).rejects.toThrow();
  await expect(pay(f, randomUUID(), [f.item, f.item])).rejects.toThrow();
  await db.query("update shopping_list_items set real_price=null where id=$1", [
    f.item,
  ]);
  await expect(pay(f)).rejects.toThrow();
  await db.exec("select set_config('app.denied','transactions',false)");
  await expect(pay(f)).rejects.toThrow();
  await db.exec("select set_config('app.denied','',false)");
});
it("deleting one purchase restores only its items", async () => {
  const f = await fixture();
  const purchase = await pay(f);
  await db.query("update shopping_list_items set checked=true where id=$1", [
    f.remaining,
  ]);
  const otherPurchase = await pay({ ...f, group: f.other, item: f.remaining });
  await db.query("select delete_transaction_with_dependencies($1)", [
    purchase.transaction_id,
  ]);
  expect(
    await rows(
      "select purchase_id,checked from shopping_list_items where id=$1",
      [f.item],
    ),
  ).toEqual([{ purchase_id: null, checked: true }]);
  expect(
    await rows("select checked from shopping_list_items where id=$1", [
      f.remaining,
    ]),
  ).toEqual([{ checked: true }]);
  expect(
    await rows("select purchase_id from shopping_list_items where id=$1", [
      f.remaining,
    ]),
  ).toEqual([{ purchase_id: otherPurchase.purchase_id }]);
  expect(
    await rows(
      "select count(*)::int n from shopping_list_purchases where list_id=$1",
      [f.list],
    ),
  ).toEqual([{ n: 1 }]);
});
it("rejects changing a paid breakdown or reusing an operation for different items", async () => {
  const f = await fixture(),
    key = randomUUID();
  await pay(f, key);
  await expect(
    db.query("update shopping_list_items set quantity=9 where id=$1", [f.item]),
  ).rejects.toThrow();
  await expect(pay(f, key, [f.remaining])).rejects.toThrow();
});
it("preserves paid list history instead of allowing physical deletion", async () => {
  const f = await fixture();
  await pay(f);
  await expect(
    db.query("delete from shopping_lists where id=$1", [f.list]),
  ).rejects.toThrow();
});
it("requires project edit access to resolve a product of its linked list", async () => {
  const f = await fixture(),
    project = randomUUID();
  await db.query(
    "insert into projects(id,household_id,created_by,name) values($1,$2,$3,'Linked')",
    [project, home, user],
  );
  await db.query("update shopping_lists set project_id=$1 where id=$2", [
    project,
    f.list,
  ]);
  await db.exec("select set_config('app.denied','projects',false)");
  try {
    await expect(
      db.query("select set_shopping_item_resolution($1,'available')", [f.item]),
    ).rejects.toThrow();
  } finally {
    await db.exec("select set_config('app.denied','',false)");
  }
});
