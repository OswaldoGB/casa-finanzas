import { z } from "zod";

export const ACCOUNT_TYPES = [
  "cash",
  "checking",
  "savings",
  "credit_card",
  "investment",
  "other",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

const money = z
  .string()
  .trim()
  .regex(
    /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/,
    "Escribe un monto válido con hasta dos decimales",
  )
  .transform(Number);
const optionalMoney = z
  .union([z.literal(""), money])
  .transform((value) => (value === "" ? null : value));
const optionalDay = z
  .union([z.literal(""), z.coerce.number().int().min(1).max(31)])
  .transform((value) => (value === "" ? null : value));
const institution = z
  .enum([
    "banco_agricola",
    "bac",
    "cuscatlan",
    "davivienda",
    "promerica",
    "azul",
    "hipotecario",
    "atlantida",
    "siman",
    "other",
  ])
  .default("other");
const network = z
  .enum(["visa", "mastercard", "amex", "siman", "other"])
  .default("other");
const lastFour = z
  .string()
  .trim()
  .regex(/^$|^\d{4}$/, "Escribe solo los últimos 4 dígitos")
  .transform((value) => value || null)
  .default("");

export const accountSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Escribe un nombre")
      .max(80, "Máximo 80 caracteres"),
    type: z.enum(ACCOUNT_TYPES),
    opening_balance: money,
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Elige un color válido"),
    icon: z.enum([
      "wallet",
      "landmark",
      "piggy-bank",
      "credit-card",
      "chart-no-axes-combined",
      "circle-dollar-sign",
    ]),
    institution,
    card_network: network,
    card_product: z.string().trim().max(80).default(""),
    card_last_four: lastFour,
    credit_limit: optionalMoney,
    statement_closing_day: optionalDay,
    payment_due_day: optionalDay,
  })
  .superRefine((value, context) => {
    if (value.type !== "credit_card") return;
    if (value.credit_limit === null || value.credit_limit <= 0)
      context.addIssue({
        code: "custom",
        path: ["credit_limit"],
        message: "Escribe un límite mayor que cero",
      });
    if (value.statement_closing_day === null)
      context.addIssue({
        code: "custom",
        path: ["statement_closing_day"],
        message: "Elige el día de corte",
      });
    if (value.payment_due_day === null)
      context.addIssue({
        code: "custom",
        path: ["payment_due_day"],
        message: "Elige el día de pago",
      });
  })
  .transform((value) =>
    value.type === "credit_card"
      ? value
      : {
          ...value,
          credit_limit: null,
          statement_closing_day: null,
          payment_due_day: null,
          card_network: null,
          card_product: null,
          card_last_four: null,
        },
  );

export const accountIdSchema = z.string().uuid("Cuenta inválida");
