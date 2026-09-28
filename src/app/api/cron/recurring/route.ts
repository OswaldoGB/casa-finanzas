import { timingSafeEqual } from "node:crypto";
import { processAllDueRecurring } from "@/features/recurring/process-due";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer /, "");
  if (
    !secret ||
    !supplied ||
    Buffer.byteLength(secret) !== Buffer.byteLength(supplied) ||
    !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))
  ) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const created = await processAllDueRecurring();
    return Response.json({ created });
  } catch (error) {
    console.error("Recurring processing failed", error);
    return Response.json(
      { error: "No se pudieron procesar los recurrentes" },
      { status: 500 },
    );
  }
}
