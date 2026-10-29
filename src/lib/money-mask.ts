// Detecta montos en texto: $1,234.56 · -$40 · $1.2k · 1,200.00 USD
export const MONEY_RE = /-?\$\s?\d[\d,]*(?:\.\d+)?\s?[kKmM]?|\d[\d,]*\.\d{2}\s?USD/;
export const HIDE_MONEY_KEY = "hide-money";
