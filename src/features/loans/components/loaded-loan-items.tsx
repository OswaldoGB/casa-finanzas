"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getLoanItems } from "../actions";
import type { LoanItem } from "../queries";

export function LoadedLoanItems({
  loanId,
  children,
}: {
  loanId: string;
  children: (items: LoanItem[]) => ReactNode;
}) {
  const [result, setResult] = useState<LoanItem[] | "error" | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    getLoanItems(loanId).then(
      (items) => {
        if (active) setResult(items);
      },
      () => {
        if (active) setResult("error");
      },
    );
    return () => {
      active = false;
    };
  }, [loanId, attempt]);

  if (result === "error")
    return (
      <button
        type="button"
        className="text-primary py-2 text-sm underline"
        onClick={() => {
          setResult(null);
          setAttempt(attempt + 1);
        }}
      >
        No se pudieron cargar los ítems. Reintentar
      </button>
    );
  if (!result)
    return (
      <p role="status" className="text-muted-foreground py-2 text-sm">
        Cargando ítems…
      </p>
    );
  if (!result.length)
    return (
      <p className="text-muted-foreground py-2 text-sm">
        No hay ítems disponibles.
      </p>
    );
  return children(result);
}
