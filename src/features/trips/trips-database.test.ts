import type { PGlite } from "@electric-sql/pglite";
import { readFile, access } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, expect, it } from "vitest";
import { createShoppingDatabase } from "../shopping-lists/database-test-fixture";
it("keeps a linked expense posted and typed as an expense", async () => {
  const project = await trip(),
    line = randomUUID();
  await db.query(
    "insert into trip_cost_lines(id,household_id,created_by,project_id,name,estimated_price) values($1,$2,$3,$4,'Hotel',314)",
    [line, ids.home, ids.user, project],
  );
  const tx = (
    await db.query<{ id: string }>(
      "select record_trip_expense($1,100,'2026-10-14',$2,$3,null,$4,false) id",
      [line, ids.account, ids.category, randomUUID()],
    )
  ).rows[0].id;
  await expect(
    db.query("update transactions set type='income' where id=$1", [tx]),
  ).rejects.toThrow(/gasto confirmado/i);
});
let db: PGlite;
const ids = Object.fromEntries(
  ["home", "user", "account", "category", "legacy", "legacyTx"].map((k) => [
    k,
    randomUUID(),
  ]),
) as {
  home: string;
  user: string;
  account: string;
  category: string;
  legacy: string;
  legacyTx: string;
};
beforeAll(async () => {
  db = await createShoppingDatabase(ids);
  const file = "supabase/migrations/20261014000044_trip_planning.sql";
  if (
    await access(file).then(
      () => true,
      () => false,
    )
  )
    await db.exec(await readFile(file, "utf8"));
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function trip() {
  return (
    await db.query<{ id: string }>(
      "select save_trip(null,'Playa',600,'2026-10-27','2026-10-30','planned','Costa del Sol','Nosotros','') id",
    )
  ).rows[0].id;
}
it("protects linked expenses even when the transaction editor cannot view projects", async () => {
  const project = await trip(),
    line = randomUUID();
  await db.query(
    "insert into trip_cost_lines(id,household_id,created_by,project_id,name,estimated_price) values($1,$2,$3,$4,'Reserva',20)",
    [line, ids.home, ids.user, project],
  );
  const tx = (
    await db.query<{ id: string }>(
      "select record_trip_expense($1,20,'2026-10-14',$2,$3,null,$4,true) id",
      [line, ids.account, ids.category, randomUUID()],
    )
  ).rows[0].id;
  await db.exec(
    "grant usage on schema public,auth to authenticated; grant select,update on all tables in schema public to authenticated; grant execute on all functions in schema public,auth to authenticated; set role authenticated; select set_config('app.denied','projects',false)",
  );
  try {
    expect(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from trip_cost_transactions where transaction_id=$1",
          [tx],
        )
      ).rows[0].n,
    ).toBe(0);
    await expect(
      db.query(
        "update transactions set type='income',project_id=null where id=$1",
        [tx],
      ),
    ).rejects.toThrow(/gasto confirmado/i);
  } finally {
    await db.exec("reset role; select set_config('app.denied','',false)");
  }
});
it("refuses changing the unit of a shared ingredient and exposes only expense summaries", async () => {
  const project = await trip(),
    activity = randomUUID(),
    item = randomUUID();
  const list = (
    await db.query<{ id: string }>("select ensure_trip_shopping_list($1) id", [
      project,
    ])
  ).rows[0].id;
  await db.query(
    "insert into trip_activities(id,household_id,created_by,project_id,date,kind,title) values($1,$2,$3,$4,'2026-10-27','breakfast','Pancakes')",
    [activity, ids.home, ids.user, project],
  );
  await db.query(
    "insert into shopping_list_items(id,household_id,created_by,list_id,name,unit) values($1,$2,$3,$4,'Leche','litro')",
    [item, ids.home, ids.user, list],
  );
  await db.query("select link_trip_item($1,$2,1,'litro',false)", [
    activity,
    item,
  ]);
  await expect(
    db.query("update shopping_list_items set unit='paquete' where id=$1", [
      item,
    ]),
  ).rejects.toThrow(/unidad/i);
  await db.query(
    "insert into transactions(household_id,created_by,type,amount,date,account_id,project_id,description) values($1,$2,'expense',10,'2026-10-14',$3,$4,'Reserva')",
    [ids.home, ids.user, ids.account, project],
  );
  const snapshot = (
    await db.query<{ data: { transactions: Record<string, unknown>[] } }>(
      "select trip_snapshot($1) data",
      [project],
    )
  ).rows[0].data;
  expect(Object.keys(snapshot.transactions[0]).sort()).toEqual(
    ["id", "amount", "date", "description", "status", "created_by"].sort(),
  );
});
it("moves a purchased list and its expenses atomically, and blocks direct detachment", async () => {
  const project = await trip(),
    nextProject = await trip(),
    item = randomUUID();
  const list = (
    await db.query<{ id: string }>("select ensure_trip_shopping_list($1) id", [
      project,
    ])
  ).rows[0].id;
  await db.query(
    "insert into shopping_list_items(id,household_id,created_by,list_id,name,real_price,checked) values($1,$2,$3,$4,'Pan',2,true)",
    [item, ids.home, ids.user, list],
  );
  const tx = (
    await db.query<{ data: { transaction_id: string } }>(
      "select record_shopping_purchase($1,null,$2,$3,$4,'2026-10-14',null,$5) data",
      [list, [item], ids.account, ids.category, randomUUID()],
    )
  ).rows[0].data.transaction_id;
  await db.query("select assign_shopping_list_project($1,$2,true)", [
    list,
    nextProject,
  ]);
  expect(
    (await db.query("select project_id from transactions where id=$1", [tx]))
      .rows,
  ).toEqual([{ project_id: nextProject }]);
  await db.exec(
    "grant usage on schema public,auth to authenticated; grant select,update on all tables in schema public to authenticated; grant execute on all functions in schema public,auth to authenticated; set role authenticated; select set_config('app.denied','projects',false)",
  );
  try {
    await expect(
      db.query("update shopping_lists set project_id=null where id=$1", [list]),
    ).rejects.toThrow(/vínculos/i);
  } finally {
    await db.exec("reset role; select set_config('app.denied','',false)");
  }
  await db.query("select assign_shopping_list_project($1,null,true)", [list]);
  expect(
    (await db.query("select project_id from transactions where id=$1", [tx]))
      .rows,
  ).toEqual([{ project_id: null }]);
});
it("creates exactly one project for a trip and protects activities when dates shrink", async () => {
  const id = await trip();
  expect(
    (
      await db.query(
        "select count(*)::int n from trip_details where project_id=$1",
        [id],
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
  await db.query(
    "insert into trip_activities(household_id,created_by,project_id,date,kind,title) values($1,$2,$3,'2026-10-30','breakfast','Pancakes')",
    [ids.home, ids.user, id],
  );
  await expect(
    db.query(
      "select save_trip($1,'Playa',600,'2026-10-27','2026-10-29','planned','','','')",
      [id],
    ),
  ).rejects.toThrow();
  await expect(
    db.query(
      "insert into trip_activities(household_id,created_by,project_id,date,kind,title) values($1,$2,$3,'2026-11-01','other','Fuera')",
      [ids.home, ids.user, id],
    ),
  ).rejects.toThrow();
});
it("links an existing expense without creating a duplicate and rejects assignment twice", async () => {
  const id = await trip(),
    line = randomUUID(),
    other = randomUUID(),
    tx = randomUUID();
  await db.query(
    "insert into trip_cost_lines(id,household_id,created_by,project_id,name,quantity,estimated_price) values($1,$2,$3,$4,'Airbnb',1,314),($5,$2,$3,$4,'Gasolina',1,35)",
    [line, ids.home, ids.user, id, other],
  );
  await db.query(
    "insert into transactions(id,household_id,created_by,type,amount,date,account_id,category_id) values($1,$2,$3,'expense',100,'2026-09-01',$4,$5)",
    [tx, ids.home, ids.user, ids.account, ids.category],
  );
  await db.query("select link_trip_cost_transaction($1,$2)", [line, tx]);
  expect(
    (
      await db.query("select project_id,amount from transactions where id=$1", [
        tx,
      ])
    ).rows,
  ).toEqual([{ project_id: id, amount: "100.00" }]);
  expect(
    (
      await db.query("select count(*)::int n from transactions where id=$1", [
        tx,
      ])
    ).rows,
  ).toEqual([{ n: 1 }]);
  await expect(
    db.query("select link_trip_cost_transaction($1,$2)", [other, tx]),
  ).rejects.toThrow();
});
it("shares one product between activities, sums requirements explicitly and rejects units", async () => {
  const id = await trip(),
    list = (
      await db.query<{ id: string }>(
        "select ensure_trip_shopping_list($1) id",
        [id],
      )
    ).rows[0].id;
  const a = randomUUID(),
    b = randomUUID(),
    item = randomUUID();
  await db.query(
    "insert into trip_activities(id,household_id,created_by,project_id,date,kind,title) values($1,$2,$3,$4,'2026-10-27','breakfast','Pancakes'),($5,$2,$3,$4,'2026-10-28','breakfast','Cereal')",
    [a, ids.home, ids.user, id, b],
  );
  await db.query(
    "insert into shopping_list_items(id,household_id,created_by,list_id,name,quantity,unit,estimated_price) values($1,$2,$3,$4,'Leche',1,'litro',2)",
    [item, ids.home, ids.user, list],
  );
  await db.query("select link_trip_item($1,$2,1,'litro',true)", [a, item]);
  await db.query("select link_trip_item($1,$2,2,'litro',true)", [b, item]);
  expect(
    (
      await db.query("select quantity from shopping_list_items where id=$1", [
        item,
      ])
    ).rows,
  ).toEqual([{ quantity: "3.000" }]);
  await expect(
    db.query("select link_trip_item($1,$2,1,'paquete',true)", [a, item]),
  ).rejects.toThrow();
});
it("rejects project edits without permission", async () => {
  await db.exec("select set_config('app.denied','projects',false)");
  await expect(trip()).rejects.toThrow();
  await db.exec("select set_config('app.denied','',false)");
});
it("records a trip expense atomically and returns the same payment on retry", async () => {
  const id = await trip(),
    line = randomUUID(),
    key = randomUUID();
  await db.query(
    "insert into trip_cost_lines(id,household_id,created_by,project_id,name,estimated_price) values($1,$2,$3,$4,'Airbnb',314)",
    [line, ids.home, ids.user, id],
  );
  const pay = () =>
    db.query<{ id: string }>(
      "select record_trip_expense($1,100,'2026-10-14',$2,$3,null,$4) id",
      [line, ids.account, ids.category, key],
    );
  const first = (await pay()).rows;
  expect((await pay()).rows).toEqual(first);
  expect(
    (
      await db.query(
        "select count(*)::int n from transactions where project_id=$1",
        [id],
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
});
it("does not expose or update a trip from another household", async () => {
  const other = randomUUID(),
    person = randomUUID(),
    project = randomUUID();
  await db.exec(`insert into households values('${other}','UTC');insert into profiles values('${person}','${other}');
    insert into projects(id,household_id,created_by,name,start_date,end_date) values('${project}','${other}','${person}','Other home','2026-10-27','2026-10-30');
    insert into trip_details(household_id,created_by,project_id) values('${other}','${person}','${project}');`);
  expect(
    (await db.query("select trip_snapshot($1) data", [project])).rows,
  ).toEqual([{ data: null }]);
  await expect(
    db.query(
      "select save_trip($1,'Otro',10,'2026-10-27','2026-10-30','planned','','','')",
      [project],
    ),
  ).rejects.toThrow();
});
it("returns the purchase, travel and products behind an expense", async () => {
  const id = await trip(),
    list = (
      await db.query<{ id: string }>(
        "select ensure_trip_shopping_list($1) id",
        [id],
      )
    ).rows[0].id,
    item = randomUUID();
  await db.query(
    "insert into shopping_list_items(id,household_id,created_by,list_id,name,quantity,unit,real_price,checked) values($1,$2,$3,$4,'Leche',3,'litro',2,true)",
    [item, ids.home, ids.user, list],
  );
  const payment = (
    await db.query<{ data: { transaction_id: string } }>(
      "select record_shopping_purchase($1,null,$2,$3,$4,'2026-10-14',null,$5) data",
      [list, [item], ids.account, ids.category, randomUUID()],
    )
  ).rows[0].data;
  const source = (
    await db.query<{ data: unknown }>(
      "select travel_transaction_source($1) data",
      [payment.transaction_id],
    )
  ).rows[0].data;
  expect(source).toMatchObject({
    list: { id: list },
    project: { id, is_trip: true },
    purchase: { store_name: "Por decidir" },
    items: [{ name: "Leche", quantity: 3, real_price: 2 }],
  });
});
