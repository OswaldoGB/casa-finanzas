"use client";

import { useEffect } from "react";
import { ACCENT_STORAGE_KEY, isAccentId } from "@/lib/theme/accents";
import { applyAccentLocally } from "@/lib/theme/use-accent";

/** Si el acento guardado en la cuenta difiere del de este navegador, gana la cuenta. */
export function AccentSync({ accent }: { accent: unknown }) {
  useEffect(() => {
    if (!isAccentId(accent)) return;
    let current: string | null = null;
    try {
      current = localStorage.getItem(ACCENT_STORAGE_KEY);
    } catch {
      // Sin almacenamiento: aplicar igual.
    }
    if (current !== accent) applyAccentLocally(accent);
  }, [accent]);
  return null;
}
