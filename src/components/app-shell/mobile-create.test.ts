import { expect, it } from "vitest";
import { getMobileCreateAction } from "./mobile-create";

it("lleva a crear una cuenta desde la pantalla de cuentas", () => {
  expect(getMobileCreateAction("/accounts")).toMatchObject({
    href: "/accounts/new",
    label: "Nueva cuenta",
    module: "accounts",
  });
});

it("abre el formulario de préstamo de la pantalla actual", () => {
  expect(getMobileCreateAction("/loans")).toMatchObject({
    href: "/loans#new-loan",
    label: "Nuevo préstamo",
    module: "loans",
  });
});

it("conserva el movimiento como acción rápida fuera de un módulo de creación", () => {
  expect(getMobileCreateAction("/dashboard")).toMatchObject({
    href: "/transactions/new",
    label: "Registrar movimiento",
    module: "transactions",
  });
});
