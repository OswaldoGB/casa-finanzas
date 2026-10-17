import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  DEVICE_COOKIE,
  deviceTokenHash,
  sameOrigin,
} from "@/features/notifications/push-subscriptions";
import { sendPush } from "@/features/notifications/push-transport";
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
  const token = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!token)
    return NextResponse.json(
      { error: "Activa este dispositivo primero" },
      { status: 400 },
    );
  const { data, error } = await supabase.rpc("claim_test_push", {
    p_device_hash: deviceTokenHash(token),
  });
  if (error || !data)
    return NextResponse.json(
      {
        error:
          error?.code === "P0001"
            ? error.message
            : "No se pudo preparar la prueba",
      },
      { status: 429 },
    );
  const p = pushSubscriptionSchema.safeParse(data);
  if (!p.success)
    return NextResponse.json(
      { error: "Suscripción inválida" },
      { status: 400 },
    );
  try {
    await sendPush(p.data, {
      message: "Las notificaciones de este dispositivo están funcionando.",
      tag: "cf-test",
      url: "/notifications",
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        error:
          "El servicio no pudo entregar el aviso. Revisa la activación e intenta de nuevo.",
      },
      { status: 502 },
    );
  }
}
