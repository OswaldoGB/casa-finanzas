import { expect, it } from "vitest";
import { reminderExportRows } from "./reminder-export";
import { BACKUP_TABLES } from "./backup-tables";
it("exports reminder content without request credentials or device data", () => {
  const rows = reminderExportRows([
    {
      id: "one",
      title: "Aceite",
      kind: "recurring",
      notes: "Filtro",
      visibility: "personal",
      create_key: "secret",
      create_payload: { password: "secret" },
      device_token_hash: "secret",
    },
  ]);
  expect(rows[0]).toMatchObject({ Título: "Aceite", Notas: "Filtro" });
  expect(JSON.stringify(rows)).not.toContain("secret");
  expect(BACKUP_TABLES).toContain("reminders");
  expect(BACKUP_TABLES).not.toContain("push_subscriptions");
});
