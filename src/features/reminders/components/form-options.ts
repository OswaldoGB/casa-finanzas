// "Se repite": atajos comunes; "custom" abre cada N + unidad.
export const REPEAT_PRESETS = [
  { value: "none", label: "No se repite" },
  { value: "week:1", label: "Cada semana" },
  { value: "month:1", label: "Cada mes" },
  { value: "month:3", label: "Cada 3 meses" },
  { value: "month:6", label: "Cada 6 meses" },
  { value: "year:1", label: "Cada año" },
  { value: "custom", label: "Personalizado…" },
];
export const ALERTS = [
  { days: 0, label: "El mismo día" },
  { days: 1, label: "1 día antes" },
  { days: 7, label: "1 semana antes" },
];
export const chip =
  "inline-flex min-h-10 cursor-pointer items-center rounded-full border px-3 text-sm transition-colors has-[:checked]:border-primary/40 has-[:checked]:bg-primary/10 has-[:checked]:text-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring";
export const check = "accent-primary size-4";
