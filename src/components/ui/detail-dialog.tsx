"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function DetailDialog({
  children,
  title = "Detalle del movimiento",
  wide = false,
}: {
  children: React.ReactNode;
  title?: string;
  wide?: boolean;
}) {
  const router = useRouter();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className={`max-h-[calc(100dvh-2rem)] min-w-0 overflow-y-auto p-5 ${wide ? "sm:max-w-5xl" : "sm:max-w-2xl"}`}
      >
        <DialogTitle className={wide ? "sr-only" : "pr-9"}>{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
