"use client";
import { Pencil, Plus } from "lucide-react";
import { buttonClass } from "@/features/shopping-lists/components/forms";
import { saveTrip } from "../actions";
import type { TripData } from "../schemas";
import { ActionDialog } from "./action-dialog";
import { TripForm } from "./trip-form";
export function TripDialog({
  trip,
  listenToNew = false,
}: {
  trip?: Pick<TripData, "project" | "detail">;
  listenToNew?: boolean;
}) {
  return (
    <ActionDialog
      title={trip ? "Editar viaje" : "Nuevo viaje"}
      action={saveTrip}
      listenToNew={listenToNew}
      redirectCreated={!trip}
      trigger={
        <button
          type="button"
          className={
            trip
              ? "hover:bg-accent inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              : buttonClass
          }
        >
          {trip ? <Pencil className="size-4" /> : <Plus className="size-4" />}
          {trip ? "Editar viaje" : "Nuevo viaje"}
        </button>
      }
    >
      <TripForm trip={trip} />
    </ActionDialog>
  );
}
