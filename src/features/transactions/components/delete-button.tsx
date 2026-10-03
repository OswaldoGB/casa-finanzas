"use client";

import { deleteTransaction } from "../actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DeleteButton({ id }: { id: string }) {
  const formId = `delete-transaction-${id}`;
  return (
    <form id={formId} action={deleteTransaction}>
      <input type="hidden" name="id" value={id} />
      <ConfirmDialog
        title="¿Borrar este movimiento?"
        description="Se eliminará el movimiento y sus comprobantes. Si nació de una lista de compra, la lista volverá a quedar abierta."
        confirmLabel="Borrar movimiento"
        trigger={
          <button
            type="button"
            className="text-destructive text-sm underline underline-offset-4"
          >
            Borrar
          </button>
        }
        actionProps={{ type: "submit", form: formId }}
      />
    </form>
  );
}
