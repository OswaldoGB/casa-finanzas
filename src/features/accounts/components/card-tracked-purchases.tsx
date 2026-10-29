"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";
import { formatUSD } from "@/lib/format";
import { payTrackedPurchase, trackPurchase, untrackPurchase } from "../card-actions";
import type { PurchaseOption, TrackedPurchase } from "../queries";

const field = "border-input bg-background h-10 w-full rounded-lg border px-3 text-sm";
const primary =
  "bg-primary text-primary-foreground h-10 rounded-lg px-4 text-sm font-medium disabled:opacity-50";

function Feedback({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (state?.error)
    return (
      <p role="alert" className="text-destructive text-sm">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="text-income text-sm">
        {state.ok}
      </p>
    );
  return null;
}

function PayForm({
  cardId,
  track,
  remaining,
  today,
  accounts,
}: {
  cardId: string;
  track: TrackedPurchase;
  remaining: number;
  today: string;
  accounts: { id: string; name: string }[];
}) {
  // Un id por envío (el botón se bloquea mientras procesa): el servidor ignora reintentos.
  const [state, action, pending] = useActionState(
    (prev: Awaited<ReturnType<typeof payTrackedPurchase>>, form: FormData) => {
      form.set("request_id", crypto.randomUUID());
      return payTrackedPurchase(prev, form);
    },
    undefined,
  );
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
      <input type="hidden" name="card_id" value={cardId} />
      <input type="hidden" name="track_id" value={track.id} />
      <label className="grid gap-1 text-xs">
        Abono
        <MoneyInput
          name="amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          max={remaining}
          step="0.01"
          required
          defaultValue={remaining}
          key={remaining}
          className={field}
        />
      </label>
      <label className="grid gap-1 text-xs">
        Fecha
        <input type="date" name="date" max={today} defaultValue={today} required className={field} />
      </label>
      <label className="grid gap-1 text-xs">
        Sale de
        <select name="account_id" required defaultValue="" className={field}>
          <option value="" disabled>
            Elige una cuenta
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <button className={primary} disabled={pending}>
        {pending ? "…" : "Abonar"}
      </button>
      <div className="sm:col-span-4">
        <Feedback state={state} />
      </div>
    </form>
  );
}

/** Pestaña "Abonos": compras de la tarjeta a las que les vas abonando. */
export function CardTrackedPurchases({
  cardId,
  tracked,
  trackable,
  paymentAccounts,
  today,
  editable,
  canTransact,
}: {
  cardId: string;
  tracked: TrackedPurchase[];
  trackable: PurchaseOption[];
  paymentAccounts: { id: string; name: string }[];
  today: string;
  editable: boolean;
  canTransact: boolean;
}) {
  const [state, action, pending] = useActionState(trackPurchase, undefined);
  const open = tracked.filter((t) => t.paid < t.amount);
  const done = tracked.filter((t) => t.paid >= t.amount);
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Abonos a compras</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Elige una compra hecha con esta tarjeta y ve abonándole. Cada abono es un pago real a la
          tarjeta: baja la deuda y se aplica al corte como cualquier pago.
        </p>
      </div>

      {editable && (
        <form action={action} className="bg-card grid gap-2 rounded-2xl border p-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <input type="hidden" name="card_id" value={cardId} />
          <label className="grid gap-1 text-sm">
            Compra a la que quieres irle abonando
            <select name="transaction_id" required defaultValue="" className={field}>
              <option value="" disabled>
                {trackable.length ? "Elige una compra reciente" : "No hay compras recientes con esta tarjeta"}
              </option>
              {trackable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.date} · {p.description || "Compra"} · {formatUSD(p.amount)}
                </option>
              ))}
            </select>
          </label>
          <button className={primary} disabled={pending || !trackable.length}>
            {pending ? "…" : "Seguir compra"}
          </button>
          <div className="sm:col-span-2">
            <Feedback state={state} />
          </div>
        </form>
      )}

      {!tracked.length && (
        <p className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
          Todavía no sigues ninguna compra.
        </p>
      )}

      {[...open, ...done].map((t) => {
        const remaining = Math.max(0, Math.round((t.amount - t.paid) * 100) / 100);
        const percent = Math.min(100, (t.paid / t.amount) * 100);
        return (
          <article key={t.id} className="bg-card space-y-3 rounded-2xl border p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-medium">{t.description || "Compra"}</h3>
                <p className="text-muted-foreground text-xs">{t.date}</p>
              </div>
              {remaining === 0 ? (
                <span className="text-income inline-flex items-center gap-1 text-sm font-medium">
                  <CheckCircle2 className="size-4" aria-hidden /> Liquidada
                </span>
              ) : (
                <p className="text-right">
                  <span className="block text-lg font-semibold tabular-nums">{formatUSD(remaining)}</span>
                  <span className="text-muted-foreground text-xs">por abonar</span>
                </p>
              )}
            </div>
            <div
              className="bg-muted h-2 overflow-hidden rounded-full"
              role="progressbar"
              aria-label={`Abonado de ${t.description || "la compra"}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percent)}
            >
              <div className={`grow-x h-full rounded-full ${remaining === 0 ? "bg-income" : "bg-primary"}`} style={{ width: `${percent}%` }} />
            </div>
            <p className="text-muted-foreground text-sm tabular-nums">
              Abonado {formatUSD(t.paid)} de {formatUSD(t.amount)}
            </p>
            {remaining > 0 && editable && canTransact && (
              <PayForm cardId={cardId} track={t} remaining={remaining} today={today} accounts={paymentAccounts} />
            )}
            {editable && (
              <form action={untrackPurchase}>
                <input type="hidden" name="card_id" value={cardId} />
                <input type="hidden" name="track_id" value={t.id} />
                <button className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline">
                  {remaining === 0 ? "Quitar de la lista" : "Dejar de seguir (los pagos hechos se conservan)"}
                </button>
              </form>
            )}
          </article>
        );
      })}
    </section>
  );
}
