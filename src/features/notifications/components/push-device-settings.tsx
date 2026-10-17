"use client";
import { useState, useEffect, useTransition } from "react";
function publicKeyBytes(value: string) {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
export function PushDeviceSettings() {
  const [state, setState] = useState("Comprobando dispositivo…"),
    [active, setActive] = useState(false),
    [supported, setSupported] = useState(false),
    [pending, start] = useTransition();
  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    const frame = requestAnimationFrame(() => {
      setSupported(supported);
      setState(
        !supported
          ? "Este navegador no permite notificaciones web. En iPhone, añade la app a inicio y ábrela desde allí."
          : Notification.permission === "denied"
            ? "El permiso está bloqueado. Puedes cambiarlo desde la configuración del navegador."
            : "Puedes activar avisos en este dispositivo.",
      );
    });
    if (supported)
      fetch("/api/notifications/subscription", { cache: "no-store" })
        .then((r) => r.json())
        .then((r) => {
          setActive(r.active === true);
          if (r.active)
            setState("Notificaciones activadas en este dispositivo.");
        })
        .catch(() =>
          setState("No se pudo comprobar la activación. Vuelve a intentar."),
        );
    return () => cancelAnimationFrame(frame);
  }, []);
  async function activate(reset = false) {
    const key = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
    if (!key)
      throw new Error(
        "Las notificaciones del teléfono aún no están configuradas.",
      );
    const permission = await Notification.requestPermission();
    if (permission !== "granted")
      throw new Error(
        "No se concedió permiso. Puedes seguir usando la bandeja de la app.",
      );
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (reset && subscription) {
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription ??= await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKeyBytes(key),
    });
    const r = await fetch("/api/notifications/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error ?? "No se pudo activar.");
    setActive(true);
    setState("Notificaciones activadas en este dispositivo.");
  }
  function run(work: () => Promise<void>) {
    start(async () => {
      try {
        await work();
      } catch (error) {
        setState(
          error instanceof Error
            ? error.message
            : "No se pudo completar la operación.",
        );
      }
    });
  }
  return (
    <section className="bg-card space-y-4 rounded-2xl border p-5">
      <h2 className="font-semibold">Avisos en este dispositivo</h2>
      <p role="status" className="text-muted-foreground text-sm">
        {state}
      </p>
      <div className="flex flex-wrap gap-2">
        {supported && !active && (
          <button
            disabled={pending}
            className="bg-primary text-primary-foreground min-h-11 rounded-xl px-4 text-sm"
            onClick={() => run(() => activate())}
          >
            {pending ? "Activando…" : "Activar notificaciones"}
          </button>
        )}
        {supported && !active && (
          <button
            disabled={pending}
            className="min-h-11 rounded-xl border px-4 text-sm"
            onClick={() => run(() => activate(true))}
          >
            Restablecer suscripción del navegador
          </button>
        )}
        {active && (
          <>
            <button
              disabled={pending}
              className="min-h-11 rounded-xl border px-4 text-sm"
              onClick={() =>
                run(async () => {
                  const r = await fetch("/api/notifications/test-push", {
                    method: "POST",
                  });
                  const result = await r.json();
                  if (!r.ok) throw new Error(result.error);
                  setState(
                    "Prueba enviada. Revisa las notificaciones del dispositivo.",
                  );
                })
              }
            >
              Enviar aviso de prueba
            </button>
            <button
              disabled={pending}
              className="text-muted-foreground min-h-11 rounded-xl border px-4 text-sm"
              onClick={() =>
                run(async () => {
                  const r = await fetch("/api/notifications/subscription", {
                    method: "DELETE",
                  });
                  if (!r.ok)
                    throw new Error("No se pudo desactivar. Intenta de nuevo.");
                  const reg =
                    await navigator.serviceWorker.getRegistration("/");
                  await (
                    await reg?.pushManager.getSubscription()
                  )?.unsubscribe();
                  setActive(false);
                  setState("Desactivadas en este dispositivo.");
                })
              }
            >
              Desactivar aquí
            </button>
          </>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        Se revisan cada día. Los avisos muestran un mensaje genérico; los
        detalles se consultan al iniciar sesión. En iPhone, usa la app añadida a
        la pantalla de inicio.
      </p>
    </section>
  );
}
