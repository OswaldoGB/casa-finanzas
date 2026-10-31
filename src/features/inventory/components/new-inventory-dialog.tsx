"use client";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InventoryForm } from "./inventory-form";

type Transaction = { id: string; date: string; description: string; amount: number };
export function NewInventoryDialog({ transactions }: { transactions: Transaction[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#new-inventory") {
        setOpen(true);
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button id="new-inventory" className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium">Nuevo artículo</button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"><DialogTitle>Nuevo artículo</DialogTitle><DialogDescription>Registra lo que tienes y cómo está organizado.</DialogDescription><InventoryForm transactions={transactions} onSuccess={close}/></DialogContent>
  </Dialog>;
}
