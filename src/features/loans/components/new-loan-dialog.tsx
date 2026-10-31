"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function NewLoanDialog({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#new-loan") {
        setOpen(true);
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button id="new-loan" className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium">{title}</button></DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Completa los datos para registrar el movimiento.</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
