import { beforeAll, afterAll, it, expect } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  createReminderDatabase,
  ids,
} from "../reminders/database-test-fixture";
let db: PGlite;
beforeAll(async () => {
  db = await createReminderDatabase();
  await db.exec(
    await readFile(
      "supabase/migrations/20261017000047_reminder_notifications.sql",
      "utf8",
    ),
  );
  await db.exec(
    `insert into module_permissions values('${ids.member}','reminders','edit')`,
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function record(visibility = "personal") {
  return (
    await db.query<{ r: { id: string; occurrence_id: string } }>(
      "select save_reminder($1::jsonb,$2) r",
      [
        JSON.stringify({
          title: "Privado",
          kind: "once",
          due_date: "2026-10-24",
          visibility,
          alert_days: [7, 1, 0],
        }),
        randomUUID(),
      ],
    )
  ).rows[0].r;
}
it("prepares one inbox alert per recipient and never exposes a private note to admins", async () => {
  await db.exec(`select set_config('app.user','${ids.member}',false)`);
  const r = await record();
  await db.query("select prepare_reminder_notifications('2026-10-17 15:00Z')");
  await db.query("select prepare_reminder_notifications('2026-10-17 15:00Z')");
  expect(
    (
      await db.query(
        "select count(*)::int n from user_notifications where reminder_id=$1",
        [r.id],
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
  await db.exec(
    `select set_config('app.user','${ids.admin}',false);set role authenticated`,
  );
  expect(
    (
      await db.query("select * from user_notifications where reminder_id=$1", [
        r.id,
      ])
    ).rows,
  ).toEqual([]);
  await db.exec("reset role");
});
it("invalidates pending alerts on snooze and immediately hides shared alerts on privacy change", async () => {
  const r = await record("household");
  await db.query("select prepare_reminder_notifications('2026-10-17 15:00Z')");
  await db.query(
    "select reminder_operation($1,'snooze','{\"date\":\"2026-11-24\"}')",
    [r.id],
  );
  expect(
    (
      await db.query(
        "select count(*)::int n from user_notifications where reminder_id=$1 and is_active",
        [r.id],
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
});
it("protects queue functions from authenticated callers", async () => {
  await db.exec("set role authenticated");
  try {
    await expect(
      db.query("select claim_notification_deliveries(50,now())"),
    ).rejects.toThrow(/permission/i);
  } finally {
    await db.exec("reset role");
  }
});
it("leases work once and cancels a claimed delivery when its reminder changes", async () => {
  await db.exec(
    `select set_config('app.user','${ids.admin}',false);insert into reminder_preferences(user_id,household_id,push_enabled)values('${ids.admin}','${ids.home}',true)on conflict(user_id)do update set push_enabled=true;insert into push_subscriptions(household_id,user_id,endpoint,keys,device_token_hash)values('${ids.home}','${ids.admin}','https://fcm.googleapis.com/fcm/send/test','{}','test-device')`,
  );
  const r = await record();
  await db.query("select prepare_reminder_notifications('2026-10-17 15:00Z')");
  const first = (
    await db.query<{
      r: { id: string; lease_token: string; reminder_id: string }[];
    }>("select claim_notification_deliveries(50,'2026-10-17 15:00Z') r")
  ).rows[0].r;
  expect(first.some((d) => d.reminder_id === r.id)).toBe(true);
  expect(
    (
      await db.query(
        "select claim_notification_deliveries(50,'2026-10-17 15:00Z') r",
      )
    ).rows,
  ).toEqual([{ r: [] }]);
  const claim = first.find((d) => d.reminder_id === r.id)!;
  await db.query("select reminder_operation($1,'archive','{}')", [r.id]);
  expect(
    (
      await db.query("select validate_notification_delivery($1,$2) ok", [
        claim.id,
        claim.lease_token,
      ])
    ).rows,
  ).toEqual([{ ok: false }]);
});
