"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useSidebar } from "@/components/ui/sidebar";
import { ManualView } from "@/features/help/manual-view";
import { loadManual, manualForPath, type ManualEntry } from "@/features/help/registry";
import type { Manual } from "@/features/help/types";
import { recentNotices } from "@/features/notifications/actions";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { useInboxSync } from "@/features/notifications/components/notification-bell";

// Botonera oculta/visible: se recuerda en este navegador.
const KEY = "casa.botonera";
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => (listeners.add(cb), () => listeners.delete(cb));
const readHidden = () => {
  try {
    return localStorage.getItem(KEY) === "oculta";
  } catch {
    return false;
  }
};
function setHidden(value: boolean) {
  try {
    localStorage.setItem(KEY, value ? "oculta" : "visible");
  } catch {
    // Sin almacenamiento: dura lo que la pestaña.
  }
  listeners.forEach((l) => l());
}

type Notices = Awaited<ReturnType<typeof recentNotices>>;
const railButton =
  "text-primary hover:bg-accent focus-visible:ring-ring relative grid size-10 place-items-center border-t outline-none focus-visible:ring-2 focus-visible:ring-inset";

/** Botonera derecha: menú lateral, notificaciones y manual de la pantalla actual. */
export function ToolsRail({
  unread,
  userId,
  hasReminders,
  manuals,
}: {
  unread: number;
  userId: string;
  hasReminders: boolean;
  manuals: ManualEntry[];
}) {
  const hidden = useSyncExternalStore(subscribe, readHidden, () => false);
  const { state, isMobile, openMobile, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const current = manualForPath(pathname, manuals);
  const inboxError = useInboxSync(userId, hasReminders);

  const [notices, setNotices] = useState<Notices | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [view, setView] = useState<{ key: string; manual: Manual | null; failed?: boolean } | null>(null);

  // El manual se pide al abrir el panel; no viaja escondido en cada página.
  function openManual(entry: ManualEntry) {
    setView({ key: entry.key, manual: null });
    loadManual(entry.key)
      .then((manual) => setView({ key: entry.key, manual }))
      .catch(() => setView({ key: entry.key, manual: null, failed: true }));
  }
  function openHelp() {
    setHelpOpen(true);
    if (current) openManual(current);
    else setView(null);
  }
  const menuHidden = isMobile ? !openMobile : state === "collapsed";
  const MenuIcon = menuHidden ? PanelLeftOpen : PanelLeftClose;
  const groups = Object.entries(
    manuals.reduce<Record<string, ManualEntry[]>>((acc, m) => ((acc[m.group] ??= []).push(m), acc), {}),
  );

  if (hidden)
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        title="Mostrar herramientas"
        aria-label="Mostrar herramientas"
        className="bg-primary text-primary-foreground fixed top-20 right-0 z-40 rounded-l-lg px-1 py-3 shadow-lg print:hidden"
      >
        <ChevronLeft className="size-4" />
      </button>
    );

  return (
    <>
      <nav
        aria-label="Herramientas"
        className="bg-card fixed top-20 right-0 z-40 flex flex-col overflow-hidden rounded-l-xl border border-r-0 shadow-lg print:hidden"
      >
        <button
          type="button"
          onClick={() => setHidden(true)}
          title="Ocultar herramientas"
          aria-label="Ocultar herramientas"
          className="bg-primary text-primary-foreground grid size-10 place-items-center"
        >
          <X className="size-5" />
        </button>
        <button
          type="button"
          onClick={toggleSidebar}
          title={menuHidden ? "Mostrar menú lateral" : "Contraer menú lateral"}
          aria-label={menuHidden ? "Mostrar menú lateral" : "Contraer menú lateral"}
          className={railButton}
        >
          <MenuIcon className="size-5" />
        </button>
        <Popover onOpenChange={(open) => open && hasReminders && recentNotices().then(setNotices).catch(() => setNotices(null))}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title={inboxError ? "Avisos: entra a la bandeja para actualizar" : "Notificaciones"}
              aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}
              className={railButton}
            >
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="bg-destructive absolute top-1 right-1 min-w-4 rounded-full px-1 text-center text-[10px] leading-4 text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent side="left" align="start" className="max-h-[70vh] w-80 overflow-y-auto p-4">
            <p className="text-primary text-xs font-semibold tracking-wider uppercase">Notificaciones</p>
            {!hasReminders ? (
              <p className="text-muted-foreground mt-3 text-sm">
                Aquí verás tus avisos cuando tengas acceso a Recordatorios.
              </p>
            ) : notices === null ? (
              <p className="text-muted-foreground mt-3 text-sm">Cargando…</p>
            ) : (
              <div className="mt-3">
                <NotificationList notifications={notices.notifications} records={notices.records} />
                <Link href="/notifications" className="text-primary mt-3 inline-block text-sm font-medium">
                  Ver toda la bandeja
                </Link>
              </div>
            )}
          </PopoverContent>
        </Popover>
        <button
          type="button"
          onClick={openHelp}
          title="Manual de esta pantalla"
          aria-label="Manual de esta pantalla"
          className={railButton}
        >
          <CircleHelp className="size-5" />
        </button>
      </nav>

      <Sheet open={helpOpen} onOpenChange={setHelpOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
          <div className="bg-card flex items-center gap-3 border-b px-5 py-4 pr-12">
            <span className="bg-accent text-accent-foreground grid size-9 shrink-0 place-items-center rounded-xl">
              <BookOpen className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-primary text-xs font-semibold tracking-wider uppercase">Ayuda</p>
              <SheetTitle className="truncate text-base">
                {view ? (manuals.find((m) => m.key === view.key)?.title ?? "Manual") : "Índice de manuales"}
              </SheetTitle>
              <SheetDescription className="sr-only">Manual de uso de la app</SheetDescription>
            </div>
            {view && (
              <button
                type="button"
                onClick={() => setView(null)}
                className="hover:bg-muted rounded-lg border px-3 py-1.5 text-xs font-semibold"
              >
                Índice
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {view ? (
              view.manual ? (
                <ManualView manual={view.manual} />
              ) : (
                <p className="text-muted-foreground py-12 text-center text-sm">
                  {view.failed ? "No se pudo cargar este manual. Revisa tu conexión." : "Cargando manual…"}
                </p>
              )
            ) : (
              <div className="space-y-5">
                {!current && (
                  <p className="border-warning/40 bg-warning/10 rounded-xl border px-4 py-3 text-sm">
                    Esta pantalla todavía no tiene manual. Puedes consultar cualquiera de estos:
                  </p>
                )}
                {groups.map(([group, items]) => (
                  <section key={group} className="bg-card overflow-hidden rounded-2xl border">
                    <p className="text-muted-foreground border-b px-4 py-2.5 text-xs font-semibold tracking-wider uppercase">
                      {group}
                    </p>
                    <ul className="divide-y">
                      {items.map((m) => (
                        <li key={m.key}>
                          <button
                            type="button"
                            onClick={() => openManual(m)}
                            className="hover:bg-accent flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium"
                          >
                            <span>{m.title}</span>
                            {m.key === current?.key ? (
                              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-semibold">
                                Esta pantalla
                              </span>
                            ) : (
                              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
