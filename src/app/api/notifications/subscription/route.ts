import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import {
  DEVICE_COOKIE,
  deviceTokenHash,
  sameOrigin,
  revokeBrowserBinding,
} from "@/features/notifications/push-subscriptions";
import { pushSubscriptionSchema } from "@/features/notifications/push-validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Origen no autorizado" },
      { status: 403 },
    );
  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  if (!claims.data?.claims.sub)
    return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > 8192)
    return NextResponse.json(
      { error: "Petición demasiado grande" },
      { status: 413 },
    );
  const p = pushSubscriptionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!p.success)
    return NextResponse.json(
      { error: "Suscripción inválida o navegador no compatible" },
      { status: 400 },
    );
  const jar = await cookies(),
    token =
      jar.get(DEVICE_COOKIE)?.value ?? randomBytes(32).toString("base64url");
  const result = await supabase.rpc("register_push_subscription", {
    p_endpoint: p.data.endpoint,
    p_keys: p.data.keys,
    p_device_hash: deviceTokenHash(token),
    p_name: "Navegador",
  });
  if (result.error)
    return NextResponse.json(
      {
        error:
          result.error.code === "P0001"
            ? result.error.message
            : "No se pudo activar este dispositivo",
      },
      { status: result.error.code === "P0001" ? 409 : 500 },
    );
  jar.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: 31536000,
  });
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Origen no autorizado" },
      { status: 403 },
    );
  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  if (!claims.data?.claims.sub)
    return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  try {
    await revokeBrowserBinding();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo desactivar. Vuelve a intentar." },
      { status: 500 },
    );
  }
}
export async function GET() {
  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  if (!claims.data?.claims.sub)
    return NextResponse.json({ active: false }, { status: 401 });
  const jar = await cookies(),
    token = jar.get(DEVICE_COOKIE)?.value;
  if (!token)
    return NextResponse.json(
      { active: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("device_token_hash", deviceTokenHash(token))
    .eq("is_active", true)
    .maybeSingle();
  return NextResponse.json(
    { active: !error && !!data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
