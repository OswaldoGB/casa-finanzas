import "server-only";
import webpush from "web-push";
import { pushSubscriptionSchema } from "./push-validation";
export async function sendPush(
  subscription: { endpoint: string; keys: { auth: string; p256dh: string } },
  payload: { message: string; tag: string; url: string },
) {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY,
    privateKey = process.env.WEB_PUSH_PRIVATE_KEY,
    subject = process.env.WEB_PUSH_SUBJECT;
  if (!publicKey || !privateKey || !subject)
    throw new Error("Web Push no configurado");
  const validated = pushSubscriptionSchema.parse(subscription);
  return webpush.sendNotification(
    validated,
    JSON.stringify({ title: "Casa & Finanzas", ...payload }),
    {
      vapidDetails: { subject, publicKey, privateKey },
      timeout: 10000,
      TTL: 86400,
      urgency: "normal",
    },
  );
}
