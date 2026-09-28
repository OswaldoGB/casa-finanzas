"use client";

import { deleteTransaction } from "../actions";

export function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteTransaction}
      onSubmit={(event) => {
        if (!window.confirm("¿Borrar este movimiento?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="text-destructive text-sm underline underline-offset-4">
        Borrar
      </button>
    </form>
  );
}
