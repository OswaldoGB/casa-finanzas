import { beforeAll, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { createReminderDatabase, ids } from "./database-test-fixture";
let db: PGlite;
beforeAll(async () => {
  db = await createReminderDatabase();
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function save(input: Record<string, unknown>, key = randomUUID()) {
  return (
    await db.query<{
      r: { id: string; occurrence_id: string; schedule_revision: number };
    }>("select save_reminder($1::jsonb,$2) r", [
      JSON.stringify({
        title: "Aceite",
        kind: "recurring",
        visibility: "personal",
        due_date: "2026-11-17",
        repeat_unit: "month",
        repeat_interval: 1,
        repeat_from: "completion",
        alert_days: [7, 1, 0],
        ...input,
      }),
      key,
    ])
  ).rows[0].r;
}
it("isolates personal notes even from the household administrator", async () => {
  await db.exec(
    `insert into module_permissions values('${ids.member}','reminders','edit');select set_config('app.user','${ids.member}',false);set role authenticated`,
  );
  const r = await save({ title: "Personal" });
  await db.exec(`select set_config('app.user','${ids.admin}',false)`);
  expect(
    (await db.query("select id from reminders where id=$1", [r.id])).rows,
  ).toEqual([]);
  expect(
    (await db.query("select reminder_snapshot($1) r", [r.id])).rows,
  ).toEqual([{ r: null }]);
  await expect(
    db.query("select reminder_operation($1,'archive','{}')", [r.id]),
  ).rejects.toThrow(/permiso|disponible/i);
  await db.exec("reset role");
});
it("completes and retries exactly once without completing the next occurrence", async () => {
  const r = await save({}),
    key = randomUUID(),
    input = JSON.stringify({ performed_date: "2026-10-16", notes: "5W30" });
  const first = (
    await db.query("select complete_reminder($1,$2,$3::jsonb,$4) r", [
      r.id,
      r.occurrence_id,
      input,
      key,
    ])
  ).rows;
  expect(
    (
      await db.query("select complete_reminder($1,$2,$3::jsonb,$4) r", [
        r.id,
        r.occurrence_id,
        input,
        key,
      ])
    ).rows,
  ).toEqual(first);
  await expect(
    db.query("select complete_reminder($1,$2,$3::jsonb,$4)", [
      r.id,
      r.occurrence_id,
      input,
      randomUUID(),
    ]),
  ).rejects.toThrow(/ocasión/i);
  expect(
    (
      await db.query(
        "select count(*)::int n from reminder_events where reminder_id=$1 and kind='completed'",
        [r.id],
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
  expect(
    (
      await db.query(
        "select due_date::text,status from reminders where id=$1",
        [r.id],
      )
    ).rows,
  ).toEqual([{ due_date: "2026-11-16", status: "active" }]);
});
it("enforces view/edit and household boundaries and permits only owners to change privacy", async () => {
  const r = await save({ visibility: "household" });
  await db.exec(
    `update module_permissions set level='view' where user_id='${ids.member}';select set_config('app.user','${ids.member}',false);set role authenticated`,
  );
  expect(
    (await db.query("select id from reminders where id=$1", [r.id])).rows,
  ).toHaveLength(1);
  await expect(save({ id: r.id, title: "Otro" })).rejects.toThrow(/permiso/i);
  await db.exec(
    `reset role;update module_permissions set level='edit' where user_id='${ids.member}';set role authenticated`,
  );
  await expect(save({ id: r.id, visibility: "personal" })).rejects.toThrow(
    /propietario/i,
  );
  await db.exec(`select set_config('app.user','${ids.outsider}',false)`);
  expect((await db.query("select id from reminders", [])).rows).toEqual([]);
  await db.exec(
    `reset role;select set_config('app.user','${ids.admin}',false)`,
  );
});
it("records an already completed task atomically and preserves history on edits", async () => {
  const key = randomUUID(),
    r = await save(
      {
        performed_date: "2026-10-16",
        performed_notes: "Filtro nuevo",
        due_km: 120000,
        repeat_km: 5000,
        performed_km: 120000,
      },
      key,
    );
  expect(
    (await db.query("select due_km from reminders where id=$1", [r.id])).rows,
  ).toEqual([{ due_km: "125000.0" }]);
  await save({ id: r.id, title: "Título cambiado" });
  expect(
    (
      await db.query<{ s: { title: string } }>(
        "select snapshot s from reminder_events where reminder_id=$1 and kind='completed'",
        [r.id],
      )
    ).rows[0].s.title,
  ).toBe("Aceite");
});
it("keeps SQL recurrence aligned with previews and preserves snoozed anchors", async () => {
  expect(
    (
      await db.query(
        "select reminder_next_date('2026-02-28','2026-01-31','month',1)::text d",
      )
    ).rows,
  ).toEqual([{ d: "2026-03-31" }]);
  expect(
    (
      await db.query(
        "select reminder_next_date('2028-02-29','2028-02-29','year',1)::text d",
      )
    ).rows,
  ).toEqual([{ d: "2029-02-28" }]);
  const r = await save({
    repeat_from: "calendar",
    due_date: "2026-10-01",
    repeat_unit: "week",
  });
  await db.query("select reminder_operation($1,'snooze',$2::jsonb)", [
    r.id,
    JSON.stringify({ date: "2026-11-01" }),
  ]);
  const done = (
    await db.query<{ r: { due_date: string; anchor_date: string } }>(
      "select complete_reminder($1,$2,$3::jsonb,$4) r",
      [
        r.id,
        r.occurrence_id,
        JSON.stringify({ performed_date: "2026-10-16" }),
        randomUUID(),
      ],
    )
  ).rows[0].r;
  expect(done.anchor_date).toBe("2026-10-01");
  // Calendario fijo: la siguiente ocasión semanal desde el ancla que caiga después
  // de hoy real (la función usa now()), no una fecha fija que caduca con el tiempo.
  const today = (
    await db.query<{ d: string }>(
      "select (now() at time zone h.timezone)::date::text d from reminders x join households h on h.id = x.household_id where x.id = $1",
      [r.id],
    )
  ).rows[0].d;
  let expected = "2026-10-01";
  while (expected <= today || expected <= "2026-10-16") {
    const next = new Date(`${expected}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 7);
    expected = next.toISOString().slice(0, 10);
  }
  expect(done.due_date).toBe(expected);
});
