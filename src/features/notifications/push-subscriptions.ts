import "server-only";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
export const DEVICE_COOKIE = "cf-push-device";
export function deviceTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
// The random HttpOnly cookie proves control of this browser, for revocation only.
export async function revokeBrowserBinding() {
  const jar = await cookies(),
    token = jar.get(DEVICE_COOKIE)?.value;
  if (!token) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("device_token_hash", deviceTokenHash(token));
  if (error)
    throw new Error(
      "No se pudo desactivar el dispositivo. Intenta cerrar sesión nuevamente.",
    );
  jar.delete(DEVICE_COOKIE);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return (
    origin === new URL(request.url).origin &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}
