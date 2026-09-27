import { describe, expect, it } from "vitest";
import { canAccess, MODULES, type PermissionMap } from "./modules";

describe("permisos por módulo", () => {
  it("el administrador puede ver y editar todos los módulos", () => {
    for (const { name } of MODULES) {
      expect(canAccess("admin", {}, name, "view")).toBe(true);
      expect(canAccess("admin", {}, name, "edit")).toBe(true);
    }
  });

  it("un miembro sin permisos no tiene acceso", () => {
    expect(canAccess("member", {}, "dashboard", "view")).toBe(false);
    expect(canAccess("member", { accounts: "none" }, "accounts", "edit")).toBe(
      false,
    );
  });

  it("lectura permite ver pero nunca editar", () => {
    const permissions: PermissionMap = { transactions: "view" };
    expect(canAccess("member", permissions, "transactions", "view")).toBe(true);
    expect(canAccess("member", permissions, "transactions", "edit")).toBe(
      false,
    );
    expect(canAccess("member", permissions, "accounts", "view")).toBe(false);
  });

  it("edición incluye lectura", () => {
    expect(
      canAccess("member", { shopping_lists: "edit" }, "shopping_lists", "view"),
    ).toBe(true);
    expect(
      canAccess("member", { shopping_lists: "edit" }, "shopping_lists", "edit"),
    ).toBe(true);
  });
});
