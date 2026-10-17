"use client";
import { useRouter } from "next/navigation";
import { FormSelect } from "@/components/ui/form-select";
import { fieldClass } from "@/features/shopping-lists/components/forms";
import type { ReminderFilters } from "../filters";
import type { ReminderCategory } from "../types";
export function ReminderFiltersForm({
  filters,
  categories,
}: {
  filters: ReminderFilters;
  categories: ReminderCategory[];
}) {
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const p = new URLSearchParams();
        for (const [k, v] of new FormData(e.currentTarget)) {
          if (v && v !== "all") p.set(k, String(v));
        }
        router.push(`/reminders?${p}`);
      }}
      className="bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <input type="hidden" name="view" value={filters.view} />
      <label className="grid gap-1 text-xs">
        Buscar
        <input
          name="q"
          defaultValue={filters.q}
          maxLength={120}
          placeholder="Título o referencia"
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-xs">
        Categoría
        <FormSelect
          name="category"
          defaultValue={filters.category || "all"}
          placeholder="Todas"
          options={[
            { value: "all", label: "Todas" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </label>
      <label className="grid gap-1 text-xs">
        Referencia
        <input
          name="reference"
          defaultValue={filters.reference}
          maxLength={80}
          placeholder="Todas"
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-xs">
        Privacidad
        <FormSelect
          name="privacy"
          defaultValue={filters.privacy || "all"}
          placeholder="Todas"
          options={[
            { value: "all", label: "Todas" },
            { value: "personal", label: "Personal" },
            { value: "household", label: "Compartido" },
          ]}
        />
      </label>
      <button className="bg-secondary text-secondary-foreground min-h-11 self-end rounded-lg px-4 text-sm">
        Aplicar filtros
      </button>
    </form>
  );
}
