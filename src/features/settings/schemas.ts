import { z } from "zod";
import { email, password } from "../auth/schemas";
import { MODULE_NAMES } from "../permissions/modules";

export const memberSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Escribe el nombre")
    .max(80, "Máximo 80 caracteres"),
  email,
  password,
});

export const householdSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribe el nombre del hogar")
    .max(80, "Máximo 80 caracteres"),
  timezone: z
    .string()
    .refine(
      (tz) => Intl.supportedValuesOf("timeZone").includes(tz) || tz === "UTC",
      "Zona horaria inválida",
    ),
});

export const permissionsSchema = z.object({
  userId: z.string().uuid("Miembro inválido"),
  permissions: z.record(z.enum(MODULE_NAMES), z.enum(["none", "view", "edit"])),
});
