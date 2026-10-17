"use client";
import {
  Car,
  PawPrint,
  HeartPulse,
  GraduationCap,
  House,
  NotebookPen,
} from "lucide-react";
import { FormSelect } from "@/components/ui/form-select";
import { fieldClass } from "@/features/shopping-lists/components/forms";
import { saveReminderCategory } from "../actions";
import type { ReminderCategory } from "../types";
import { ReminderDialog } from "./reminder-dialog";
const icons = {
  car: Car,
  "paw-print": PawPrint,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  house: House,
  "notebook-pen": NotebookPen,
};
export function CategoryIcon({
  category,
}: {
  category?: Pick<ReminderCategory, "icon" | "color">;
}) {
  const Icon = icons[category?.icon as keyof typeof icons] ?? NotebookPen;
  return (
    <span
      className="inline-grid size-9 shrink-0 place-items-center rounded-xl"
      style={{
        color: category?.color ?? "var(--primary)",
        backgroundColor: category ? `${category.color}18` : "var(--muted)",
      }}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  );
}
export function CategoryDialog({ category }: { category?: ReminderCategory }) {
  return (
    <ReminderDialog
      title={category ? "Editar categoría" : "Nueva categoría"}
      action={saveReminderCategory}
      trigger={
        <button className="rounded-lg border px-3 py-2 text-sm">
          {category ? category.name : "Nueva categoría"}
        </button>
      }
    >
      {category && <input name="id" type="hidden" value={category.id} />}
      <label className="grid gap-1 text-sm">
        Nombre
        <input
          name="name"
          maxLength={60}
          defaultValue={category?.name}
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Color
        <input
          name="color"
          type="color"
          defaultValue={category?.color ?? "#8b5cf6"}
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Ícono
        <FormSelect
          name="icon"
          defaultValue={category?.icon ?? "notebook-pen"}
          placeholder="Ícono"
          options={[
            { value: "car", label: "Vehículo" },
            { value: "paw-print", label: "Mascota" },
            { value: "heart-pulse", label: "Salud" },
            { value: "graduation-cap", label: "Estudios" },
            { value: "house", label: "Hogar" },
            { value: "notebook-pen", label: "Personal" },
          ]}
        />
      </label>
      {category && (
        <label className="flex items-center gap-2 text-sm">
          <input
            name="is_archived"
            type="checkbox"
            defaultChecked={category.is_archived}
          />
          Archivar categoría (conserva sus registros)
        </label>
      )}
    </ReminderDialog>
  );
}
