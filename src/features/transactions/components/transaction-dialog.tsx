"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Transaction } from "../queries";
import { TransactionForm } from "./transaction-form";

type Options = Parameters<typeof TransactionForm>[0]["options"];

export function TransactionDialog({
  options,
  transaction,
  defaultOpen = false,
  compact = false,
}: {
  options: Options;
  transaction?: Transaction;
  defaultOpen?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const router = useRouter();
  const editing = Boolean(transaction);
  const requestedFromUrl = useSearchParams().get("new") === "1" && !editing;

  useEffect(() => {
    if (!requestedFromUrl) return;

    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [requestedFromUrl]);

  const changeOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next && !editing) {
        const url = new URL(window.location.href);
        if (url.searchParams.get("new") === "1") {
          url.searchParams.delete("new");
          window.history.replaceState(
            null,
            "",
            `${url.pathname}${url.search}${url.hash}`,
          );
        }
      }
    },
    [editing],
  );

  const saved = useCallback(
    (message: string) => {
      toast.success(message);
      changeOpen(false);
      router.refresh();
    },
    [router, changeOpen],
  );

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={editing ? "Editar movimiento" : "Nuevo movimiento"}
          title={editing ? "Editar movimiento" : "Nuevo movimiento"}
          className={
            compact
              ? "text-primary hover:bg-accent inline-flex size-9 items-center justify-center rounded-lg transition-colors"
              : "bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow"
          }
        >
          {editing ? (
            <Pencil className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {!compact && (editing ? "Editar movimiento" : "Nuevo movimiento")}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-1rem)] overflow-y-auto p-5 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar movimiento" : "Nuevo movimiento"}
          </DialogTitle>
          <DialogDescription>
            Los cambios se guardan sin salir de esta pantalla.
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          transaction={transaction}
          options={options}
          rememberDefaults={!editing}
          onSuccess={saved}
        />
      </DialogContent>
    </Dialog>
  );
}
