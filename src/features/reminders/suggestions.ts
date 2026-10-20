// Intervalos típicos para lo que la gente registra "ya lo hice".
// ponytail: lista corta a mano; se amplía cuando aparezcan casos reales.
export type Suggestion = {
  label: string;
  preset: string; // mismo formato que REPEAT_PRESETS: "month:3", "year:1"…
  km?: number;
  category?: "vehicles" | "pets" | "health" | "home";
};

const RULES: [RegExp, Suggestion][] = [
  [/aceite/, { label: "cambio de aceite", preset: "month:3", km: 5000, category: "vehicles" }],
  [/llanta|neumatic|rotacion/, { label: "rotación de llantas", preset: "month:6", km: 10000, category: "vehicles" }],
  [/alineacion|balanceo/, { label: "alineación y balanceo", preset: "month:6", km: 10000, category: "vehicles" }],
  [/freno|pastilla/, { label: "frenos", preset: "year:1", km: 20000, category: "vehicles" }],
  [/filtro de aire|filtro del aire/, { label: "filtro de aire", preset: "year:1", km: 15000, category: "vehicles" }],
  [/servicio|mantenimiento|revision/, { label: "mantenimiento", preset: "month:6", km: 10000, category: "vehicles" }],
  [/desparasit/, { label: "desparasitación", preset: "month:3", category: "pets" }],
  [/vacuna/, { label: "vacuna", preset: "year:1", category: "pets" }],
  [/bano|grooming|peluqueria canina/, { label: "baño", preset: "month:1", category: "pets" }],
  [/dentista|limpieza dental/, { label: "dentista", preset: "month:6", category: "health" }],
  [/chequeo|examen general|laboratorio/, { label: "chequeo", preset: "year:1", category: "health" }],
  [/filtro de agua|purificador/, { label: "filtro de agua", preset: "month:6", category: "home" }],
  [/fumiga/, { label: "fumigación", preset: "month:6", category: "home" }],
];

export function suggestFor(title: string): Suggestion | null {
  const t = title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return RULES.find(([re]) => re.test(t))?.[1] ?? null;
}
