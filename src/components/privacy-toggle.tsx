"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";
import { HIDE_MONEY_KEY, MONEY_RE } from "@/lib/money-mask";

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => (listeners.add(cb), () => listeners.delete(cb));
const isHidden = () => document.documentElement.classList.contains("hide-money");

/** Marca con data-money el elemento que contiene cada monto (incluye SVG de gráficos). */
function markMoney(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (el && !el.hasAttribute("data-money") && MONEY_RE.test(n.nodeValue ?? ""))
      el.setAttribute("data-money", "");
  }
}

export function PrivacyToggle() {
  const hidden = useSyncExternalStore(subscribe, isHidden, () => false);

  // Mientras está activo, marca también lo que se pinte después (tooltips, contadores).
  useEffect(() => {
    if (!hidden) return;
    markMoney(document.body);
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "characterData") markMoney(r.target.parentNode ?? r.target);
        r.addedNodes.forEach((node) => markMoney(node));
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [hidden]);

  function toggle() {
    const next = !isHidden();
    document.documentElement.classList.toggle("hide-money", next);
    try {
      localStorage.setItem(HIDE_MONEY_KEY, next ? "1" : "0");
    } catch {
      // Sin almacenamiento: dura lo que la pestaña.
    }
    listeners.forEach((l) => l());
  }

  const Icon = hidden ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={hidden ? "Mostrar montos" : "Ocultar montos"}
      title={hidden ? "Mostrar montos" : "Ocultar montos"}
      className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-9 shrink-0 place-items-center rounded-lg"
    >
      <Icon className="size-4" />
    </button>
  );
}
