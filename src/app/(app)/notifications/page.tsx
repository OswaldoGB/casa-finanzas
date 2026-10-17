import { getNotifications } from "@/features/notifications/queries";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { NotificationPreferences } from "@/features/notifications/components/notification-preferences";
import { ReminderActionForm } from "@/features/reminders/components/reminder-dialog";
import { markNoticesRead } from "@/features/notifications/actions";
import Link from "next/link";
export const metadata = { title: "Notificaciones" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const p = Number((await searchParams).page ?? 1),
    page = Number.isInteger(p) && p > 0 && p < 10000 ? p : 1;
  const data = await getNotifications(page);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Notificaciones</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tus avisos, en un solo lugar.
          </p>
        </div>
        {data.unread > 0 && (
          <ReminderActionForm
            action={markNoticesRead}
            label="Marcar todas como leídas"
          >
            {null}
          </ReminderActionForm>
        )}
      </header>
      <NotificationList
        notifications={data.notifications}
        records={data.records}
      />
      {data.count > 30 && (
        <nav className="flex justify-between text-sm">
          {page > 1 ? (
            <Link href={`/notifications?page=${page - 1}`}>← Anterior</Link>
          ) : (
            <span />
          )}
          {page * 30 < data.count && (
            <Link href={`/notifications?page=${page + 1}`}>Siguiente →</Link>
          )}
        </nav>
      )}
      <NotificationPreferences
        key={JSON.stringify(data.preferences)}
        preferences={data.preferences}
      />
    </div>
  );
}
