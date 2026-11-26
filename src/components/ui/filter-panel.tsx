import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

export function FilterPanel({ children }: { children: ReactNode }) {
  return (
    <details className="group bg-card rounded-xl border">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal className="size-4" aria-hidden />
        Filtros
        <ChevronDown
          className="ml-auto size-4 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t p-4">{children}</div>
    </details>
  );
}
