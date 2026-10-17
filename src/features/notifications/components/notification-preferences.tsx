"use client";
import { ReminderActionForm } from "@/features/reminders/components/reminder-dialog";
import { saveNotificationPreferences } from "../actions";
import type { NotificationPreference } from "../types";
export function NotificationPreferences({
  preferences,
}: {
  preferences: NotificationPreference | null;
}) {
  return (
    <section className="bg-card rounded-2xl border p-5">
      <h2 className="mb-4 font-semibold">Tus preferencias</h2>
      <ReminderActionForm action={saveNotificationPreferences}>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            name="shared_enabled"
            defaultChecked={preferences?.shared_enabled ?? true}
          />
          Recibir avisos de recordatorios compartidos del hogar
        </label>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            name="push_enabled"
            defaultChecked={preferences?.push_enabled ?? false}
          />
          Permitir envíos a mis dispositivos activados
        </label>
        <p className="text-muted-foreground text-xs">
          Desactivar el teléfono no elimina los avisos dentro de la app.
        </p>
      </ReminderActionForm>
    </section>
  );
}
