import { timingSafeEqual } from "node:crypto";
export async function handleReminderCron(
  request: Request,
  run: () => Promise<Record<string, unknown>>,
  secret: string | undefined,
) {
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer /, "");
  if (
    !secret ||
    !supplied ||
    Buffer.byteLength(secret) !== Buffer.byteLength(supplied) ||
    !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))
  )
    return Response.json({ error: "No autorizado" }, { status: 401 });
  try {
    return Response.json(await run());
  } catch {
    console.error("No se pudieron procesar los avisos de recordatorios");
    return Response.json(
      { error: "No se pudieron procesar los avisos" },
      { status: 500 },
    );
  }
}
