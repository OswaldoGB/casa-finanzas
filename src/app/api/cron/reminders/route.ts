import { handleReminderCron } from "@/features/notifications/cron-handler";
import { processDueNotifications } from "@/features/notifications/process-due";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  return handleReminderCron(
    request,
    () => processDueNotifications(),
    process.env.CRON_SECRET,
  );
}
