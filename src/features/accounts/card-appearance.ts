export const institutions = [
  { value: "banco_agricola", label: "Banco Agrícola" },
  { value: "bac", label: "BAC" },
  { value: "cuscatlan", label: "Banco Cuscatlán" },
  { value: "davivienda", label: "Davivienda" },
  { value: "promerica", label: "Banco Promérica" },
  { value: "azul", label: "Banco Azul" },
  { value: "hipotecario", label: "Banco Hipotecario" },
  { value: "atlantida", label: "Banco Atlántida" },
  { value: "siman", label: "CREDISIMAN" },
  { value: "other", label: "Otro emisor" },
] as const;

export const networks = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "amex", label: "American Express" },
  { value: "siman", label: "CREDISIMAN" },
  { value: "other", label: "Otra red" },
] as const;

type Institution = (typeof institutions)[number]["value"];

type Product = {
  value: string;
  label: string;
  imageUrl?: string;
  fallback: string;
};

const products: Record<Institution, Product[]> = {
  banco_agricola: [
    { value: "clasica", label: "Clásica Visa", fallback: "agricola" },
    {
      value: "dorada",
      label: "Dorada Visa",
      imageUrl: "https://www.bancoagricola.com/multimedia/render/10462",
      fallback: "agricola",
    },
    { value: "platinum", label: "Platinum", fallback: "agricola" },
    { value: "infinite", label: "Infinite", fallback: "agricola" },
    { value: "black", label: "Black Mastercard", fallback: "agricola" },
  ],
  bac: [
    { value: "clasica", label: "Clásica", fallback: "bac" },
    { value: "dorada", label: "Dorada", fallback: "bac" },
    { value: "platinum", label: "Platinum", fallback: "bac" },
    { value: "black", label: "Black", fallback: "bac" },
    { value: "infinite", label: "Infinite", fallback: "bac" },
    { value: "lifemiles", label: "LifeMiles", fallback: "bac" },
    { value: "millas_plus", label: "Millás Plus", fallback: "bac" },
  ],
  cuscatlan: [
    { value: "clasica", label: "Clásica", fallback: "cuscatlan" },
    { value: "oro", label: "Oro", fallback: "cuscatlan" },
    { value: "platinum", label: "Platinum", fallback: "cuscatlan" },
    { value: "cashback", label: "Cash Back", fallback: "cuscatlan" },
    { value: "multipuntos", label: "MultiPuntos", fallback: "cuscatlan" },
  ],
  davivienda: [
    { value: "clasica", label: "Clásica", fallback: "davivienda" },
    { value: "oro", label: "Oro", fallback: "davivienda" },
    { value: "platinum", label: "Platinum", fallback: "davivienda" },
    { value: "infinite", label: "Infinite", fallback: "davivienda" },
  ],
  promerica: [
    { value: "clasica", label: "Clásica", fallback: "promerica" },
    { value: "oro", label: "Oro", fallback: "promerica" },
    { value: "platinum", label: "Platinum", fallback: "promerica" },
    { value: "black", label: "Black", fallback: "promerica" },
  ],
  azul: [
    { value: "clasica", label: "Clásica", fallback: "azul" },
    { value: "oro", label: "Oro", fallback: "azul" },
    { value: "platinum", label: "Platinum", fallback: "azul" },
  ],
  hipotecario: [
    { value: "clasica", label: "Clásica", fallback: "hipotecario" },
    { value: "oro", label: "Oro", fallback: "hipotecario" },
  ],
  atlantida: [
    { value: "clasica", label: "Clásica", fallback: "atlantida" },
    { value: "oro", label: "Oro", fallback: "atlantida" },
    { value: "platinum", label: "Platinum", fallback: "atlantida" },
  ],
  siman: [
    { value: "azul", label: "CREDISIMAN Azul", fallback: "siman" },
    { value: "premier", label: "CREDISIMAN Premier", fallback: "siman" },
    { value: "diamante", label: "CREDISIMAN Diamante", fallback: "siman" },
  ],
  other: [{ value: "custom", label: "Producto personalizado", fallback: "other" }],
};

export function cardProductOptions(institution: string) {
  return products[institution as Institution] ?? products.other;
}

export function cardAppearance({
  institution,
  network,
  product,
}: {
  institution?: string | null;
  network?: string | null;
  product?: string | null;
}) {
  const items = cardProductOptions(institution ?? "other");
  const match = items.find((item) => item.value === product) ?? items[0];
  const networkLabel = networks.find((item) => item.value === network)?.label;
  return {
    label: match.label,
    imageUrl: match.imageUrl ?? null,
    fallback: match.fallback,
    networkLabel,
  };
}
