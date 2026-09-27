import { z } from "zod";

export const email = z.string().trim().toLowerCase().email("Correo inválido");
export const password = z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres");

export const loginSchema = z.object({ email, password: z.string().min(1, "Escribe tu contraseña") });
export const forgotSchema = z.object({ email });
export const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] });
export const setupSchema = z.object({
  fullName: z.string().trim().min(1, "Escribe tu nombre").max(80),
  householdName: z.string().trim().min(1, "Escribe el nombre del hogar").max(80),
  email,
  password,
  timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz) || tz === "UTC", "Zona horaria inválida"),
});

export type FormState = { error?: string; fieldErrors?: Record<string, string[] | undefined>; ok?: string } | undefined;

/** Evita open redirects: solo rutas internas. */
export function safeNext(next: FormDataEntryValue | string | null | undefined): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/dashboard";
}
