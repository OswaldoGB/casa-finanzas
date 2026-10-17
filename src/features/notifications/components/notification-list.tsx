"use client";
import Link from "next/link";
import { BellRing } from "lucide-react";
import { useTransition, useState } from "react";
import { markNoticesRead, refreshMyNotices } from "../actions";
import type { UserNotification } from "../types";
import { ReminderActionForm } from "@/features/reminders/components/reminder-dialog";
export function NotificationList({
  notifications,
  records,
}: {
  notifications: UserNotification[];
  records: {
    id: string;
    title: string;
    effective_date: string | null;
    reference: string;
  }[];
}) {
  const [pending, start] = useTransition(),
    [error, setError] = useState("");
  return (
    <section className="space-y-3">
      <button
        className="text-primary min-h-10 rounded-lg border px-3 text-sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const r = await refreshMyNotices();
              setError(r.error ?? "");
            } catch {
              setError("No se pudieron actualizar los avisos.");
            }
          })
        }
      >
        {pending ? "Actualizando…" : "Actualizar avisos"}
      </button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {!notifications.length ? (
        <div className="bg-card rounded-2xl border p-8 text-center">
          <BellRing className="text-primary mx-auto size-8" />
          <p className="mt-3 font-medium">Tu bandeja está al día</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Aquí aparecerán tus próximos recordatorios.
          </p>
        </div>
      ) : (
        notifications.map((n) => {
          const r = records.find((r) => r.id === n.reminder_id);
          return (
            <article
              key={n.id}
              className={`bg-card rounded-2xl border p-4 ${!n.read_at ? "border-primary/30" : ""}`}
            >
              <p className="text-muted-foreground text-xs">
                {n.created_at.slice(0, 10)}
                {!n.read_at ? " · Sin leer" : " · Leído"}
              </p>
              <Link
                href={`/reminders/${n.reminder_id}`}
                className="mt-2 block font-semibold break-words hover:underline"
              >
                {r?.title ?? "Recordatorio por revisar"}
              </Link>
              <p className="text-muted-foreground mt-1 text-sm">{n.message}</p>
              {!n.read_at && (
                <div className="mt-3">
                  <ReminderActionForm
                    action={markNoticesRead}
                    label="Marcar como leído"
                  >
                    <input name="id" type="hidden" value={n.id} />
                  </ReminderActionForm>
                </div>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}
