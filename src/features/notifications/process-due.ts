import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "./push-transport";
import { deliverClaim, type DeliveryOutcome } from "./delivery";
import type { DeliveryClaim } from "./types";
const claimsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    lease_token: z.string().uuid(),
    notification_id: z.string().uuid(),
    reminder_id: z.string().uuid(),
    message: z.string(),
    subscription_id: z.string().uuid(),
    endpoint: z.string(),
    keys: z.object({ auth: z.string(), p256dh: z.string() }),
    attempts: z.number(),
  }),
);
export async function processDueNotifications(now = new Date()) {
  const admin = createAdminClient();
  const prepared = await admin.rpc("prepare_reminder_notifications", {
    p_now: now.toISOString(),
  });
  if (prepared.error) throw new Error("No se pudo preparar la bandeja");
  const configured = !!(
    process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY &&
    process.env.WEB_PUSH_PRIVATE_KEY &&
    process.env.WEB_PUSH_SUBJECT
  );
  if (!configured)
    return { prepared: prepared.data, configured: false, sent: 0 };
  const result = await admin.rpc("claim_notification_deliveries", {
    p_limit: 50,
    p_now: now.toISOString(),
  });
  if (result.error) throw new Error("No se pudo leer la cola");
  const claims = claimsSchema.parse(result.data),
    deadline = Date.now() + 40000;
  let index = 0,
    sent = 0,
    failed = 0;
  async function finish(c: DeliveryClaim, outcome: DeliveryOutcome) {
    const timestamp = new Date();
    if (outcome === "expired") {
      const { error } = await admin
        .from("push_subscriptions")
        .update({ is_active: false })
        .eq("id", c.subscription_id);
      if (error)
        throw new Error("No se pudo desactivar una suscripción expirada");
    }
    const { error, data } = await admin
      .from("notification_deliveries")
      .update({
        status: outcome === "expired" ? "failed" : outcome,
        sent_at: outcome === "sent" ? timestamp.toISOString() : null,
        lease_token: null,
        lease_until: null,
        next_attempt_at: new Date(
          timestamp.getTime() + 12 * 3600000,
        ).toISOString(),
        last_error: outcome === "sent" ? null : outcome,
      })
      .eq("id", c.id)
      .eq("lease_token", c.lease_token)
      .select("id");
    if (error || !data?.length) throw new Error("La entrega perdió su reserva");
  }
  await Promise.all(
    Array.from({ length: Math.min(5, claims.length) }, async () => {
      while (Date.now() < deadline) {
        const c = claims[index++];
        if (!c) break;
        try {
          const outcome = await deliverClaim(c, {
            validate: async (c) => {
              const r = await admin.rpc("validate_notification_delivery", {
                p_id: c.id,
                p_lease_token: c.lease_token,
              });
              if (r.error) throw new Error("No se pudo validar la entrega");
              return r.data;
            },
            send: async (c) => {
              await sendPush(c, {
                message: c.message,
                tag: `cf-${c.notification_id}`,
                url: `/reminders/${c.reminder_id}`,
              });
            },
            finish,
          });
          if (outcome === "sent") sent++;
          else if (outcome !== "cancelled") failed++;
        } catch {
          failed++;
          console.error(
            "No se completó una entrega de recordatorios; se recuperará su reserva",
          );
        }
      }
    }),
  );
  return {
    prepared: prepared.data,
    configured: true,
    sent,
    failed,
    claimed: claims.length,
  };
}
