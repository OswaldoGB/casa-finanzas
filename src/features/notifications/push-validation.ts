import { z } from "zod";
export function validatePushEndpoint(value: string): URL {
  const u = new URL(value);
  const allowed =
    u.hostname === "fcm.googleapis.com" ||
    u.hostname === "updates.push.services.mozilla.com" ||
    u.hostname === "web.push.apple.com" ||
    /^[a-z0-9-]+\.notify\.windows\.com$/.test(u.hostname);
  if (
    value.length > 4096 ||
    u.protocol !== "https:" ||
    !allowed ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    u.hash ||
    u.pathname === "/"
  )
    throw new Error("Servidor de notificaciones no compatible");
  return u;
}
export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .max(4096)
    .refine((v) => {
      try {
        validatePushEndpoint(v);
        return true;
      } catch {
        return false;
      }
    }, "Endpoint no válido"),
  keys: z.object({
    p256dh: z
      .string()
      .regex(/^[A-Za-z0-9_-]{87}$/)
      .refine(
        (v) =>
          Buffer.from(v, "base64url").length === 65 &&
          Buffer.from(v, "base64url")[0] === 4,
      ),
    auth: z
      .string()
      .regex(/^[A-Za-z0-9_-]{22}$/)
      .refine((v) => Buffer.from(v, "base64url").length === 16),
  }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
