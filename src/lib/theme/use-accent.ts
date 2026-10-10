"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { ACCENT_STORAGE_KEY, DEFAULT_ACCENT, accentVars, isAccentId, type AccentId } from "./accents";

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => (listeners.add(cb), () => listeners.delete(cb));

function read(): AccentId {
  try {
    const v = localStorage.getItem(ACCENT_STORAGE_KEY);
    return isAccentId(v) ? v : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

/** Aplica el acento en este navegador (DOM + localStorage), sin tocar el servidor. */
export function applyAccentLocally(id: AccentId) {
  for (const [k, v] of Object.entries(accentVars(id))) document.documentElement.style.setProperty(k, v);
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, id);
  } catch {
    // Modo privado: el acento dura lo que la pestaña.
  }
  listeners.forEach((l) => l());
}

export function useAccent() {
  const accent = useSyncExternalStore(subscribe, read, () => DEFAULT_ACCENT);

  const setAccent = useCallback(async (id: AccentId) => {
    applyAccentLocally(id);
    // Sincroniza entre dispositivos vía user_metadata; sin sesión (login) queda local.
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const { error } = await supabase.auth.updateUser({ data: { accent: id } });
    // Reemite el JWT para que el servidor lea el acento nuevo en sus claims.
    if (!error) await supabase.auth.refreshSession();
    return error;
  }, []);

  return { accent, setAccent };
}
