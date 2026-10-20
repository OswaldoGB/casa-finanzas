import { describe, expect, it } from "vitest";
import { reminderSchema } from "./schemas";

// Lo que envía "Ya lo hice" (reminder-log-form) debe pasar la validación del servidor.
describe("payload de «Ya lo hice»", () => {
  it("aceite ayer, cada 3 meses o 5000 km", () => {
    const r = reminderSchema.safeParse({
      title: "Cambio de aceite",
      kind: "recurring",
      due_date: "2026-10-19",
      repeat_from: "completion",
      repeat_unit: "month",
      repeat_interval: "3",
      current_km: "120000",
      due_km: "120000",
      repeat_km: "5000",
      category_id: "none",
      alert_days: ["7", "0"],
    });
    expect(r.success, JSON.stringify(r.error?.flatten())).toBe(true);
  });
  it("solo historial, sin repetición", () => {
    const r = reminderSchema.safeParse({ title: "Dentista", kind: "once", due_date: "2026-10-19", alert_days: ["7", "0"] });
    expect(r.success).toBe(true);
  });
  it("solo por kilometraje", () => {
    const r = reminderSchema.safeParse({
      title: "Rotación",
      kind: "recurring",
      due_date: "2026-10-19",
      current_km: "120000",
      due_km: "120000",
      repeat_km: "10000",
      alert_days: [],
    });
    expect(r.success, JSON.stringify(r.error?.flatten())).toBe(true);
  });
});
