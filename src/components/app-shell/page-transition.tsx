"use client";

import { ViewTransition } from "react";
import { usePathname } from "next/navigation";

/**
 * Anima solo al cambiar de ruta: el key fuerza salida/entrada en navegación,
 * mientras que los refrescos por server actions (mismo key) no animan.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page-enter" exit="page-exit" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
