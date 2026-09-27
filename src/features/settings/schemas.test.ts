import { describe, expect, it } from "vitest";
import { householdSchema, memberSchema, permissionsSchema } from "./schemas";

describe("formularios de configuración", () => {
  it("valida y normaliza los datos del miembro", () => {
    expect(
      memberSchema.parse({
        fullName: "  Pareja  ",
        email: "PAREJA@example.com",
        password: "12345678",
      }),
    ).toEqual({
      fullName: "Pareja",
      email: "pareja@example.com",
      password: "12345678",
    });
    expect(
      memberSchema.safeParse({ fullName: " ", email: "mal", password: "123" })
        .success,
    ).toBe(false);
  });

  it("rechaza zonas horarias inexistentes y nombres vacíos", () => {
    expect(
      householdSchema.safeParse({
        name: "Casa",
        timezone: "America/El_Salvador",
      }).success,
    ).toBe(true);
    expect(
      householdSchema.safeParse({
        name: "Casa",
        timezone: "Inventada/Incorrecta",
      }).success,
    ).toBe(false);
    expect(
      householdSchema.safeParse({ name: " ", timezone: "UTC" }).success,
    ).toBe(false);
  });

  it("rechaza niveles y módulos manipulados", () => {
    const userId = "00000000-0000-4000-8000-000000000001";
    expect(
      permissionsSchema.safeParse({
        userId,
        permissions: { dashboard: "edit" },
      }).success,
    ).toBe(true);
    expect(
      permissionsSchema.safeParse({
        userId,
        permissions: { dashboard: "admin" },
      }).success,
    ).toBe(false);
    expect(
      permissionsSchema.safeParse({ userId, permissions: { settings: "edit" } })
        .success,
    ).toBe(false);
    expect(
      permissionsSchema.safeParse({ userId: "otro", permissions: {} }).success,
    ).toBe(false);
  });
});
