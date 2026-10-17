import Link from "next/link";
import { getReminder } from "@/features/reminders/queries";
import { ReminderCard } from "@/features/reminders/components/reminder-card";
import { ReminderHistory } from "@/features/reminders/components/reminder-history";
export const metadata = { title: "Detalle del recordatorio" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    data = await getReminder(id);
  if (!data)
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-xl font-semibold">
          Este registro no está disponible
        </h1>
        <p className="text-muted-foreground text-sm">
          Puede haberse archivado o cambiado su privacidad. Solo se muestran
          registros a los que tienes acceso.
        </p>
        <Link href="/reminders" className="text-primary underline">
          Volver a Recordatorios
        </Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/reminders" className="text-muted-foreground text-sm">
        ← Recordatorios
      </Link>
      <ReminderCard
        record={data.reminder}
        categories={data.categories}
        today={data.today}
        userId={data.userId}
        canEdit={data.canEdit}
      />
      <ReminderHistory events={data.events} />
    </div>
  );
}
