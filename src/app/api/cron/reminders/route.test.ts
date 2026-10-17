import { expect, it, vi } from "vitest";
import { handleReminderCron } from "../../../../features/notifications/cron-handler";
it("rejects absent or invalid secrets without processing private work", async () => {
  const run = vi.fn();
  for (const header of [null, "Bearer wrong"]) {
    const r = await handleReminderCron(
      new Request("https://app.test/api/cron/reminders", {
        headers: header ? { authorization: header } : {},
      }),
      run,
      "secret",
    );
    expect(r.status).toBe(401);
  }
  expect(run).not.toHaveBeenCalled();
});
it("runs an authorized cron and returns counts", async () => {
  const r = await handleReminderCron(
    new Request("https://app.test/api/cron/reminders", {
      headers: { authorization: "Bearer secret" },
    }),
    async () => ({ sent: 2 }),
    "secret",
  );
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ sent: 2 });
});
