"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TransactionForm } from "./transaction-form";

type Props = { options: Parameters<typeof TransactionForm>[0]["options"] };
export function QuickEntry({ options }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Registrar movimiento"
        className="bg-primary text-primary-foreground inline-flex size-12 items-center justify-center rounded-full shadow"
      >
        <Plus aria-hidden />
      </button>
      {open && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-3 sm:place-items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Registro rápido"
            className="bg-background max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Registro rápido</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="text-muted-foreground px-2 py-1 text-xl"
              >
                ×
              </button>
            </div>
            <TransactionForm quick options={options} />
          </section>
        </div>
      )}
    </>
  );
}
